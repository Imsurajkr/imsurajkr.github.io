#!/usr/bin/env bash
#
# Network Lens — collector
# https://surajkr.dev/tools/network-lens
#
# Reads what this machine already knows about its own network and writes it to
# a JSON file. Nothing is uploaded, nothing is changed, and no network requests
# are made: every fact comes from a local command or from /proc.
#
# Linux only. Windows has its own collector, netlens.ps1.
#
# Read this script before running it. That is the point of shipping it as a
# file rather than something you pipe into a shell.
#
#   Usage: bash netlens.sh [-o FILE] [--redact] [--stdout] [--help]
#
#     -o FILE     where to write     (default ./netlens-report.json)
#     --redact    replace hostnames, usernames and public addresses with
#                 stable placeholders, for a report you intend to share
#     --stdout    write to stdout instead of a file
#
# Exit codes: 0 report written, 1 usage error, 2 could not write output.

set -uo pipefail

NETLENS_VERSION="1.0"
OUT="netlens-report.json"
REDACT=0
TO_STDOUT=0

while [ $# -gt 0 ]; do
  case "$1" in
    -o) OUT="${2:-}"; shift 2 || { echo "-o needs a filename" >&2; exit 1; } ;;
    --redact) REDACT=1; shift ;;
    --stdout) TO_STDOUT=1; shift ;;
    -h|--help) sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- primitives

have() { command -v "$1" >/dev/null 2>&1; }
is_root() { [ "$(id -u)" -eq 0 ]; }

# Linux and macOS ship completely different network userlands: iproute2 and
# /proc on one side, BSD ifconfig/netstat on the other. Everything below
# branches on this once rather than probing per command.
case "$(uname -s 2>/dev/null)" in
  Linux) OS_FAMILY="linux" ;;
  Darwin) OS_FAMILY="macos" ;;   # detected, but not supported -- see below
  *BSD) OS_FAMILY="bsd" ;;
  *) OS_FAMILY="unknown" ;;
esac

# macOS uses a BSD userland this collector has not been tested against, and a
# report that silently omits most of the machine is worse than no report.
if [ "$OS_FAMILY" = "macos" ]; then
  cat >&2 <<'UNSUPPORTED'

  Network Lens does not support macOS yet.

  This collector reads iproute2 (ip, ss) and /proc, neither of which exists on
  macOS. Rather than emit a report that is mostly empty without saying so, it
  stops here.

  Linux and Windows are supported: https://surajkr.dev/tools/network-lens

UNSUPPORTED
  exit 3
fi

# JSON string escaping. Control characters are dropped rather than encoded —
# nothing collected here should contain them, and a mangled report is worse
# than a missing field.
js() {
  local s=${1-}
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=$(printf '%s' "$s" | tr -d '\000-\037')
  printf '%s' "$s"
}

# Emit "key":"value" pairs and array items, tracking commas so the output is
# valid JSON without a template engine.
BUF=""
emit() { BUF="${BUF}$1"; }

FIRST=1
sep() { if [ $FIRST -eq 1 ]; then FIRST=0; else emit ","; fi; }
open_list() { FIRST=1; }

# ------------------------------------------------------------------ redaction

REDACT_MAP_KEYS=""
REDACT_MAP_VALS=""
REDACT_N=0

# Stable placeholders, so the same host keeps the same alias throughout a
# report and the topology still reads correctly after redaction.
redact_token() {
  local raw="$1" prefix="$2" i=0 key
  [ "$REDACT" -eq 0 ] && { printf '%s' "$raw"; return; }
  [ -z "$raw" ] && { printf '%s' "$raw"; return; }

  local IFS=$'\n'
  for key in $REDACT_MAP_KEYS; do
    i=$((i + 1))
    if [ "$key" = "$raw" ]; then
      printf '%s' "$(printf '%s' "$REDACT_MAP_VALS" | sed -n "${i}p")"
      return
    fi
  done

  REDACT_N=$((REDACT_N + 1))
  local val="${prefix}-${REDACT_N}"
  REDACT_MAP_KEYS="${REDACT_MAP_KEYS}${raw}"$'\n'
  REDACT_MAP_VALS="${REDACT_MAP_VALS}${val}"$'\n'
  printf '%s' "$val"
}

# RFC 1918, CGNAT, loopback and link-local stay legible under redaction —
# they are not identifying, and hiding them would destroy the topology.
is_private_ip() {
  case "$1" in
    10.*|127.*|169.254.*|192.168.*|::1|fe80:*|fc*|fd*) return 0 ;;
    172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) return 0 ;;
    100.6[4-9].*|100.[7-9][0-9].*|100.1[0-1][0-9].*|100.12[0-7].*) return 0 ;;
    *) return 1 ;;
  esac
}

r_host() { [ "$REDACT" -eq 1 ] && redact_token "$1" "host" || printf '%s' "$1"; }
r_user() { [ "$REDACT" -eq 1 ] && redact_token "$1" "user" || printf '%s' "$1"; }
r_ip() {
  if [ "$REDACT" -eq 1 ] && ! is_private_ip "$1"; then
    redact_token "$1" "public"
  else
    printf '%s' "$1"
  fi
}

# ------------------------------------------------------------------- capability

CAP_IP=0; CAP_SS=0; CAP_NETSTAT=0; CAP_NFT=0; CAP_IPTABLES=0
CAP_CONNTRACK=0; CAP_LSOF=0; CAP_PS=0; CAP_WHO=0; CAP_ARP=0

have ip && CAP_IP=1
have ss && CAP_SS=1
have netstat && CAP_NETSTAT=1
have nft && CAP_NFT=1
have iptables && CAP_IPTABLES=1
have conntrack && CAP_CONNTRACK=1
have lsof && CAP_LSOF=1
have ps && CAP_PS=1
have who && CAP_WHO=1
have arp && CAP_ARP=1

NOTES=""
note() { NOTES="${NOTES}$1"$'\n'; }

is_root || note "Not run as root: firewall rules, NAT counters and process names for sockets owned by other users are unavailable or incomplete."
if [ "$OS_FAMILY" = "linux" ]; then
  [ $CAP_IP -eq 1 ] || note "iproute2 (ip) not installed: interfaces, routes and neighbours could not be read."
  [ $CAP_SS -eq 1 ] || [ $CAP_NETSTAT -eq 1 ] || note "Neither ss nor netstat is installed: listeners and connections could not be read."
  [ $CAP_CONNTRACK -eq 1 ] || note "conntrack not installed: active NAT translations were not enumerated."
  [ $CAP_NFT -eq 1 ] || [ $CAP_IPTABLES -eq 1 ] || note "Neither nft nor iptables is installed: firewall and NAT rules were not inspected."
else
  note "Unrecognised platform ($(uname -s 2>/dev/null)): only the fields this system happens to support were collected."
fi

# ----------------------------------------------------------------------- host

collect_host() {
  local hostname fqdn os kernel arch uptime virt
  hostname=$(hostname 2>/dev/null || cat /proc/sys/kernel/hostname 2>/dev/null || echo unknown)
  fqdn=$(hostname -f 2>/dev/null || printf '%s' "$hostname")

  if [ -r /etc/os-release ]; then
    os=$(. /etc/os-release 2>/dev/null && printf '%s' "${PRETTY_NAME:-${NAME:-unknown}}")
  else
    os="$(uname -s 2>/dev/null || echo unknown)"
  fi

  kernel=$(uname -r 2>/dev/null || echo unknown)
  arch=$(uname -m 2>/dev/null || echo unknown)

  if [ "$OS_FAMILY" = "linux" ]; then
    uptime=$(cut -d. -f1 /proc/uptime 2>/dev/null || echo 0)
    virt="none"
    if have systemd-detect-virt; then
      virt=$(systemd-detect-virt 2>/dev/null || echo none)
    elif grep -qi hypervisor /proc/cpuinfo 2>/dev/null; then
      virt="virtualised"
    fi
    grep -qa container=lxc /proc/1/environ 2>/dev/null && virt="container"
    [ -f /.dockerenv ] && virt="docker"
  fi
  : "${uptime:=0}" "${virt:=none}"

  emit "\"host\":{"
  emit "\"os_family\":\"$(js "$OS_FAMILY")\","
  emit "\"hostname\":\"$(js "$(r_host "$hostname")")\","
  emit "\"fqdn\":\"$(js "$(r_host "$fqdn")")\","
  emit "\"os\":\"$(js "$os")\","
  emit "\"kernel\":\"$(js "$kernel")\","
  emit "\"arch\":\"$(js "$arch")\","
  emit "\"virtualisation\":\"$(js "$virt")\","
  emit "\"uptime_seconds\":${uptime:-0}"
  emit "}"
}

# ----------------------------------------------------------------- interfaces


collect_interfaces() {
  emit "\"interfaces\":["
  open_list
  [ $CAP_IP -eq 1 ] || { emit "]"; return; }

  local line name state mac mtu flags
  while IFS= read -r line; do
    name=$(printf '%s' "$line" | awk -F': ' '{print $2}' | awk '{print $1}')
    [ -z "$name" ] && continue
    flags=$(printf '%s' "$line" | sed -n 's/.*<\([^>]*\)>.*/\1/p')
    state=$(printf '%s' "$line" | sed -n 's/.*state \([A-Z]*\).*/\1/p')
    mtu=$(printf '%s' "$line" | sed -n 's/.*mtu \([0-9]*\).*/\1/p')
    mac=$(printf '%s' "$line" | sed -n 's#.*link/[a-z]* \([0-9a-f:]*\).*#\1#p')

    sep
    emit "{\"name\":\"$(js "$name")\","
    emit "\"state\":\"$(js "${state:-UNKNOWN}")\","
    emit "\"mtu\":${mtu:-0},"
    emit "\"mac\":\"$(js "$mac")\","
    emit "\"flags\":\"$(js "$flags")\","
    emit "\"addresses\":["

    local afirst=1 aline addr fam scope
    while IFS= read -r aline; do
      addr=$(printf '%s' "$aline" | awk '{for(i=1;i<=NF;i++) if($i=="inet"||$i=="inet6") print $(i+1)}')
      [ -z "$addr" ] && continue
      case "$aline" in *inet6*) fam="inet6" ;; *) fam="inet" ;; esac
      scope=$(printf '%s' "$aline" | sed -n 's/.*scope \([a-z]*\).*/\1/p')
      [ $afirst -eq 1 ] && afirst=0 || emit ","
      emit "{\"address\":\"$(js "$(r_ip "${addr%%/*}")")\","
      emit "\"prefix\":${addr##*/},"
      emit "\"family\":\"$fam\",\"scope\":\"$(js "${scope:-global}")\"}"
    done <<EOF
$(ip -o addr show dev "$name" 2>/dev/null)
EOF

    emit "]}"
  done <<EOF
$(ip -o link show 2>/dev/null)
EOF
  emit "]"
}

# --------------------------------------------------------------------- routes


collect_routes() {
  emit "\"routes\":["
  open_list
  [ $CAP_IP -eq 1 ] || { emit "]"; return; }

  local line dst via dev proto metric base dst_out
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    dst=$(printf '%s' "$line" | awk '{print $1}')
    via=$(printf '%s' "$line" | sed -n 's/.*via \([^ ]*\).*/\1/p')
    dev=$(printf '%s' "$line" | sed -n 's/.*dev \([^ ]*\).*/\1/p')
    proto=$(printf '%s' "$line" | sed -n 's/.*proto \([^ ]*\).*/\1/p')
    metric=$(printf '%s' "$line" | sed -n 's/.*metric \([0-9]*\).*/\1/p')

    # Redact the network address but keep the prefix length, which carries the
    # shape of the routing table and is not identifying on its own.
    if [ "$dst" = "default" ]; then
      dst_out="default"
    else
      base=${dst%%/*}
      if [ "$base" = "$dst" ]; then
        dst_out=$(r_ip "$base")
      else
        dst_out="$(r_ip "$base")/${dst##*/}"
      fi
    fi

    sep
    emit "{\"destination\":\"$(js "$dst_out")\","
    emit "\"via\":\"$(js "$([ -n "$via" ] && r_ip "$via")")\","
    emit "\"device\":\"$(js "$dev")\","
    emit "\"protocol\":\"$(js "$proto")\","
    emit "\"metric\":${metric:-0},"
    emit "\"default\":$([ "$dst" = "default" ] && echo true || echo false)}"
  done <<EOF
$(ip -o route show 2>/dev/null)
EOF
  emit "]"
}

# ------------------------------------------------------------------ neighbors

collect_neighbors() {
  emit "\"neighbors\":["
  open_list

  if [ $CAP_IP -eq 1 ]; then
    local line addr dev mac state
    while IFS= read -r line; do
      addr=$(printf '%s' "$line" | awk '{print $1}')
      [ -z "$addr" ] && continue
      dev=$(printf '%s' "$line" | sed -n 's/.* dev \([^ ]*\).*/\1/p')
      mac=$(printf '%s' "$line" | sed -n 's/.* lladdr \([0-9a-f:]*\).*/\1/p')
      state=$(printf '%s' "$line" | awk '{print $NF}')
      sep
      emit "{\"address\":\"$(js "$(r_ip "$addr")")\","
      emit "\"device\":\"$(js "$dev")\","
      emit "\"mac\":\"$(js "$mac")\","
      emit "\"state\":\"$(js "$state")\"}"
    done <<EOF
$(ip -o neigh show 2>/dev/null)
EOF
  fi
  emit "]"
}

# ------------------------------------------------------- listeners/connections

# ss prints "users:(("name",pid=123,fd=4))" — pull the first name and pid out.
sock_process() { printf '%s' "$1" | sed -n 's/.*users:((\"\([^\"]*\)\",pid=\([0-9]*\).*/\1/p'; }
sock_pid()     { printf '%s' "$1" | sed -n 's/.*users:((\"[^\"]*\",pid=\([0-9]*\).*/\1/p'; }

# Split "1.2.3.4:80", "[::]:80" or "127.0.0.53%lo:53" into address and port.
# The %iface scope suffix appears on link-scoped addresses and is not part of
# the address for our purposes.
addr_of() {
  local a
  case "$1" in
    \[*\]:*) a=$(printf '%s' "${1%]:*}" | tr -d '[') ;;
    *) a="${1%:*}" ;;
  esac
  printf '%s' "${a%%\%*}"
}
port_of() { printf '%s' "${1##*:}"; }



collect_listeners() {
  emit "\"listeners\":["
  open_list
  [ $CAP_SS -eq 1 ] || { emit "]"; return; }

  local proto line local_ep addr port proc pid scope
  for proto in tcp udp; do
    # For a listening socket `ss -H` prints: State Recv-Q Send-Q Local Peer.
    # The local endpoint is the fourth field — the fifth is the wildcard peer.
    while IFS= read -r line; do
      case "$line" in State*|Netid*|"") continue ;; esac
      local_ep=$(printf '%s' "$line" | awk '{print $4}')
      [ -z "$local_ep" ] && continue
      addr=$(addr_of "$local_ep")
      port=$(port_of "$local_ep")
      case "$port" in ''|*[!0-9]*) continue ;; esac

      case "$addr" in
        0.0.0.0|'*'|'::'|'[::]') scope="all-interfaces" ;;
        127.*|'::1') scope="loopback" ;;
        *) scope="specific" ;;
      esac

      proc=$(sock_process "$line")
      pid=$(sock_pid "$line")

      sep
      emit "{\"protocol\":\"$proto\","
      emit "\"address\":\"$(js "$addr")\","
      emit "\"port\":$port,"
      emit "\"scope\":\"$scope\","
      emit "\"process\":\"$(js "$proc")\","
      emit "\"pid\":${pid:-0}}"
    done <<EOF
$(ss -H -lnp"${proto:0:1}" 2>/dev/null || ss -H -ln 2>/dev/null | grep -i "^$proto")
EOF
  done
  emit "]"
}

collect_connections() {
  emit "\"connections\":["
  open_list
  [ $CAP_SS -eq 1 ] || { emit "]"; return; }

  local line local_ep remote_ep state proc pid lport rport
  # Filtering by `state established` makes ss drop the State column, so the
  # layout here is: Recv-Q Send-Q Local Peer.
  state="ESTAB"
  while IFS= read -r line; do
    case "$line" in State*|Netid*|"") continue ;; esac
    local_ep=$(printf '%s' "$line" | awk '{print $3}')
    remote_ep=$(printf '%s' "$line" | awk '{print $4}')
    [ -z "$remote_ep" ] && continue

    proc=$(sock_process "$line")
    pid=$(sock_pid "$line")

    lport=$(port_of "$local_ep"); case "$lport" in ''|*[!0-9]*) lport=0 ;; esac
    rport=$(port_of "$remote_ep"); case "$rport" in ''|*[!0-9]*) rport=0 ;; esac

    sep
    emit "{\"state\":\"$(js "$state")\","
    emit "\"local_address\":\"$(js "$(r_ip "$(addr_of "$local_ep")")")\","
    emit "\"local_port\":$lport,"
    emit "\"remote_address\":\"$(js "$(r_ip "$(addr_of "$remote_ep")")")\","
    emit "\"remote_port\":$rport,"
    emit "\"process\":\"$(js "$proc")\","
    emit "\"pid\":${pid:-0}}"
  done <<EOF
$(ss -H -tnp state established 2>/dev/null || ss -H -tn state established 2>/dev/null)
EOF
  emit "]"
}

# --------------------------------------------------------------- nat/firewall

collect_firewall() {
  local backend="none" snat=0 dnat=0 masq=0 forward=0 filter=0 readable=1

  if [ $CAP_NFT -eq 1 ] && is_root; then
    backend="nft"
    local ruleset
    ruleset=$(nft list ruleset 2>/dev/null)
    if [ -n "$ruleset" ]; then
      snat=$(printf '%s\n' "$ruleset" | grep -c '\bsnat\b')
      dnat=$(printf '%s\n' "$ruleset" | grep -c '\bdnat\b')
      masq=$(printf '%s\n' "$ruleset" | grep -c '\bmasquerade\b')
      forward=$(printf '%s\n' "$ruleset" | grep -c 'chain forward')
      filter=$(printf '%s\n' "$ruleset" | grep -c '^\s*\(accept\|drop\|reject\)')
    else
      readable=0
    fi
  elif [ $CAP_IPTABLES -eq 1 ] && is_root; then
    backend="iptables"
    snat=$(iptables -t nat -S 2>/dev/null | grep -c ' -j SNAT')
    dnat=$(iptables -t nat -S 2>/dev/null | grep -c ' -j DNAT')
    masq=$(iptables -t nat -S 2>/dev/null | grep -c ' -j MASQUERADE')
    forward=$(iptables -S FORWARD 2>/dev/null | grep -vc '^-P')
    filter=$(iptables -S 2>/dev/null | grep -vc '^-P')
  else
    readable=0
    [ $CAP_NFT -eq 1 ] || [ $CAP_IPTABLES -eq 1 ] && backend="present-but-unreadable"
  fi

  local forwarding
  forwarding=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo 0)

  emit "\"firewall\":{"
  emit "\"backend\":\"$(js "$backend")\","
  emit "\"readable\":$([ $readable -eq 1 ] && echo true || echo false),"
  emit "\"snat_rules\":${snat:-0},"
  emit "\"dnat_rules\":${dnat:-0},"
  emit "\"masquerade_rules\":${masq:-0},"
  emit "\"forward_rules\":${forward:-0},"
  emit "\"filter_rules\":${filter:-0},"
  emit "\"ip_forwarding\":$([ "$forwarding" = "1" ] && echo true || echo false)"
  emit "}"
}

# ------------------------------------------------------------------- sessions

collect_sessions() {
  emit "\"sessions\":["
  open_list
  [ $CAP_WHO -eq 1 ] || { emit "]"; return; }

  local line user tty from when
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    user=$(printf '%s' "$line" | awk '{print $1}')
    tty=$(printf '%s' "$line" | awk '{print $2}')
    from=$(printf '%s' "$line" | sed -n 's/.*(\(.*\)).*/\1/p')
    when=$(printf '%s' "$line" | awk '{print $3" "$4}')
    sep
    emit "{\"user\":\"$(js "$(r_user "$user")")\","
    emit "\"tty\":\"$(js "$tty")\","
    emit "\"from\":\"$(js "$([ -n "$from" ] && r_ip "$from")")\","
    emit "\"since\":\"$(js "$when")\","
    emit "\"remote\":$([ -n "$from" ] && echo true || echo false)}"
  done <<EOF
$(who 2>/dev/null)
EOF
  emit "]"
}

# ------------------------------------------------------------------------ dns

collect_dns() {
  emit "\"dns\":{\"servers\":["
  local first=1 s
  if [ -r /etc/resolv.conf ]; then
    while read -r _ s _; do
      [ -z "$s" ] && continue
      [ $first -eq 1 ] && first=0 || emit ","
      emit "\"$(js "$(r_ip "$s")")\""
    done <<EOF
$(grep -E '^nameserver' /etc/resolv.conf 2>/dev/null)
EOF
  fi
  emit "],\"search\":["
  first=1
  local d
  for d in $(grep -E '^search' /etc/resolv.conf 2>/dev/null | head -1 | cut -d' ' -f2-); do
    [ $first -eq 1 ] && first=0 || emit ","
    emit "\"$(js "$d")\""
  done
  emit "]}"
}

# ------------------------------------------------------------- capabilities

collect_capabilities() {
  emit "\"capabilities\":{"
  emit "\"root\":$(is_root && echo true || echo false),"
  emit "\"ip\":$([ $CAP_IP -eq 1 ] && echo true || echo false),"
  emit "\"ss\":$([ $CAP_SS -eq 1 ] && echo true || echo false),"
  emit "\"netstat\":$([ $CAP_NETSTAT -eq 1 ] && echo true || echo false),"
  emit "\"nft\":$([ $CAP_NFT -eq 1 ] && echo true || echo false),"
  emit "\"iptables\":$([ $CAP_IPTABLES -eq 1 ] && echo true || echo false),"
  emit "\"conntrack\":$([ $CAP_CONNTRACK -eq 1 ] && echo true || echo false),"
  emit "\"lsof\":$([ $CAP_LSOF -eq 1 ] && echo true || echo false),"
  emit "\"ps\":$([ $CAP_PS -eq 1 ] && echo true || echo false),"
  emit "\"who\":$([ $CAP_WHO -eq 1 ] && echo true || echo false),"
  emit "\"arp\":$([ $CAP_ARP -eq 1 ] && echo true || echo false)"
  emit "}"
}

collect_notes() {
  emit "\"notes\":["
  local first=1 n
  while IFS= read -r n; do
    [ -z "$n" ] && continue
    [ $first -eq 1 ] && first=0 || emit ","
    emit "\"$(js "$n")\""
  done <<EOF
$NOTES
EOF
  emit "]"
}

# ------------------------------------------------------------------- assemble

START_MS=$(date +%s%3N 2>/dev/null || echo 0)

emit "{"
emit "\"netlens\":{\"version\":\"$NETLENS_VERSION\","
emit "\"generated\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)\","
emit "\"redacted\":$([ $REDACT -eq 1 ] && echo true || echo false)},"
collect_host; emit ","
collect_capabilities; emit ","
collect_interfaces; emit ","
collect_routes; emit ","
collect_neighbors; emit ","
collect_listeners; emit ","
collect_connections; emit ","
collect_firewall; emit ","
collect_sessions; emit ","
collect_dns; emit ","
collect_notes
emit "}"

if [ $TO_STDOUT -eq 1 ]; then
  printf '%s\n' "$BUF"
  exit 0
fi

if ! printf '%s\n' "$BUF" > "$OUT" 2>/dev/null; then
  echo "netlens: could not write to $OUT" >&2
  exit 2
fi

# A short human summary, so the terminal is not silent. The real output is JSON.
ifc=$(printf '%s' "$BUF" | grep -o '"name":' | wc -l)
lst=$(printf '%s' "$BUF" | grep -o '"scope":"all-interfaces"' | wc -l)

cat >&2 <<SUMMARY

  Network Lens — report written to $OUT

  $(is_root || printf '%s' "Run as a normal user, so firewall rules were not read.")
  $(printf '%s' "$lst") listener(s) bound to all interfaces.

  Open it at https://surajkr.dev/tools/network-lens
  Nothing was uploaded. The page reads the file in your browser.

SUMMARY
