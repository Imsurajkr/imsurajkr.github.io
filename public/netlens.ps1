<#
    Network Lens -- collector for Windows
    https://surajkr.dev/tools/network-lens

    Reads what this machine already knows about its own network and writes it
    to a JSON file. Nothing is uploaded, nothing is changed, and no network
    requests are made: every fact comes from a local cmdlet.

    Read this script before running it. That is the point of shipping it as a
    file rather than something you pipe into a shell.

      Usage: .\netlens.ps1 [-Out FILE] [-Redact] [-Stdout]

        -Out FILE   where to write   (default .\netlens-report.json)
        -Redact     replace hostnames, usernames and public addresses with
                    stable placeholders, for a report you intend to share
        -Stdout     write to stdout instead of a file

    Run in an elevated session to include firewall and NAT rules. Without
    elevation it still works and records what it could not see.
#>

[CmdletBinding()]
param(
    [string]$Out = 'netlens-report.json',
    [switch]$Redact,
    [switch]$Stdout
)

$ErrorActionPreference = 'SilentlyContinue'
$NetlensVersion = '1.0'

# ------------------------------------------------------------------ helpers

function Test-Command($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

function Test-Elevated {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
            [Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { $false }
}

$script:Notes = New-Object System.Collections.Generic.List[string]
function Add-Note($text) { $script:Notes.Add($text) | Out-Null }

# Stable placeholders, so the same host keeps the same alias throughout a
# report and the topology still reads correctly after redaction.
$script:RedactMap = @{}
$script:RedactN = 0
function Get-Alias-For($raw, $prefix) {
    if (-not $Redact -or [string]::IsNullOrEmpty($raw)) { return $raw }
    if ($script:RedactMap.ContainsKey($raw)) { return $script:RedactMap[$raw] }
    $script:RedactN++
    $val = "$prefix-$($script:RedactN)"
    $script:RedactMap[$raw] = $val
    return $val
}

# RFC 1918, CGNAT, loopback and link-local stay legible under redaction -- they
# are not identifying, and hiding them would destroy the topology.
function Test-PrivateIp($ip) {
    if ([string]::IsNullOrEmpty($ip)) { return $true }
    return $ip -match '^10\.' -or
           $ip -match '^127\.' -or
           $ip -match '^169\.254\.' -or
           $ip -match '^192\.168\.' -or
           $ip -match '^172\.(1[6-9]|2\d|3[01])\.' -or
           $ip -match '^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.' -or
           $ip -eq '::1' -or $ip -match '^f[cde]' -or $ip -eq '0.0.0.0' -or $ip -eq '::'
}

function Protect-Host($v) { if ($Redact) { Get-Alias-For $v 'host' } else { $v } }
function Protect-User($v) { if ($Redact) { Get-Alias-For $v 'user' } else { $v } }
function Protect-Ip($v) {
    if ($Redact -and -not (Test-PrivateIp $v)) { Get-Alias-For $v 'public' } else { $v }
}

# Resolve a PID to a process name once, then reuse -- Get-Process per socket is
# slow on a machine with hundreds of connections.
$script:ProcCache = @{}
function Get-ProcName($processId) {
    if ($null -eq $processId -or $processId -eq 0) { return '' }
    if ($script:ProcCache.ContainsKey($processId)) { return $script:ProcCache[$processId] }
    $name = ''
    try { $name = (Get-Process -Id $processId -ErrorAction Stop).ProcessName } catch { $name = '' }
    $script:ProcCache[$processId] = $name
    return $name
}

# --------------------------------------------------------------- capabilities

$hasNetTCPIP  = Test-Command 'Get-NetTCPConnection'
$hasNetAdapter = Test-Command 'Get-NetAdapter'
$hasFirewall  = Test-Command 'Get-NetFirewallProfile'
$hasNat       = Test-Command 'Get-NetNat'
$hasDnsClient = Test-Command 'Get-DnsClientServerAddress'
$hasCim       = Test-Command 'Get-CimInstance'
$elevated     = Test-Elevated

if (-not $elevated) {
    Add-Note 'Not running elevated: firewall rules, NAT configuration and the process behind sockets owned by other users are unavailable or incomplete.'
}
if (-not $hasNetTCPIP) {
    Add-Note 'The NetTCPIP module is unavailable, so listeners and connections were read from netstat instead and cannot be attributed to a process.'
}
if (-not $hasNat) {
    Add-Note 'Get-NetNat is not present on this edition of Windows: NAT rules were not enumerated.'
}

# ----------------------------------------------------------------------- host

function Get-HostFacts {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $uptime = 0
    if ($os -and $os.LastBootUpTime) {
        $uptime = [int]((Get-Date) - $os.LastBootUpTime).TotalSeconds
    }

    $virt = 'none'
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
    if ($cs) {
        switch -Regex ($cs.Model) {
            'Virtual Machine' { $virt = 'hyper-v' }
            'VMware'          { $virt = 'vmware' }
            'VirtualBox'      { $virt = 'virtualbox' }
            'Google'          { $virt = 'gce' }
            'HVM domU'        { $virt = 'ec2' }
        }
    }

    [ordered]@{
        os_family       = 'windows'
        hostname        = (Protect-Host $env:COMPUTERNAME)
        fqdn            = (Protect-Host ([System.Net.Dns]::GetHostName()))
        os              = if ($os) { $os.Caption } else { 'Windows' }
        kernel          = if ($os) { $os.Version } else { [string][Environment]::OSVersion.Version }
        arch            = $env:PROCESSOR_ARCHITECTURE
        virtualisation  = $virt
        uptime_seconds  = $uptime
    }
}

# ----------------------------------------------------------------- interfaces

function Get-Interfaces {
    $out = New-Object System.Collections.Generic.List[object]
    if (-not $hasNetAdapter) { return ,$out }

    foreach ($nic in Get-NetAdapter -IncludeHidden -ErrorAction SilentlyContinue) {
        $addrs = New-Object System.Collections.Generic.List[object]
        foreach ($a in Get-NetIPAddress -InterfaceIndex $nic.ifIndex -ErrorAction SilentlyContinue) {
            $addrs.Add([ordered]@{
                address = (Protect-Ip $a.IPAddress)
                prefix  = [int]$a.PrefixLength
                family  = if ($a.AddressFamily -eq 'IPv6') { 'inet6' } else { 'inet' }
                scope   = "$($a.PrefixOrigin)".ToLower()
            }) | Out-Null
        }

        $out.Add([ordered]@{
            name      = $nic.Name
            state     = if ($nic.Status -eq 'Up') { 'UP' } else { 'DOWN' }
            mtu       = [int]$nic.MtuSize
            mac       = "$($nic.MacAddress)".Replace('-', ':').ToLower()
            flags     = "$($nic.MediaConnectionState)"
            addresses = $addrs
        }) | Out-Null
    }
    return ,$out
}

# --------------------------------------------------------------------- routes

function Get-Routes {
    $out = New-Object System.Collections.Generic.List[object]
    if (-not (Test-Command 'Get-NetRoute')) { return ,$out }

    foreach ($r in Get-NetRoute -ErrorAction SilentlyContinue) {
        $isDefault = ($r.DestinationPrefix -eq '0.0.0.0/0' -or $r.DestinationPrefix -eq '::/0')
        $via = if ($r.NextHop -eq '0.0.0.0' -or $r.NextHop -eq '::') { '' } else { (Protect-Ip $r.NextHop) }
        $dest = $r.DestinationPrefix
        if ($isDefault) {
            $dest = 'default'
        } elseif ($Redact) {
            $parts = $dest -split '/'
            if ($parts.Count -eq 2) { $dest = "$(Protect-Ip $parts[0])/$($parts[1])" }
        }

        $ifName = ''
        try { $ifName = (Get-NetAdapter -InterfaceIndex $r.InterfaceIndex -ErrorAction Stop).Name } catch {}

        $out.Add([ordered]@{
            destination = $dest
            via         = $via
            device      = $ifName
            protocol    = "$($r.Protocol)"
            metric      = [int]$r.RouteMetric
            default     = $isDefault
        }) | Out-Null
    }
    return ,$out
}

# ------------------------------------------------------------------ neighbors

function Get-Neighbors {
    $out = New-Object System.Collections.Generic.List[object]
    if (-not (Test-Command 'Get-NetNeighbor')) { return ,$out }

    foreach ($n in Get-NetNeighbor -ErrorAction SilentlyContinue |
                   Where-Object { $_.State -ne 'Permanent' -and $_.LinkLayerAddress }) {
        $ifName = ''
        try { $ifName = (Get-NetAdapter -InterfaceIndex $n.InterfaceIndex -ErrorAction Stop).Name } catch {}

        # Windows states map onto the Linux vocabulary the viewer already uses.
        $state = switch ("$($n.State)") {
            'Reachable'  { 'REACHABLE' }
            'Stale'      { 'STALE' }
            'Incomplete' { 'INCOMPLETE' }
            'Unreachable'{ 'FAILED' }
            default      { "$($n.State)".ToUpper() }
        }

        $out.Add([ordered]@{
            address = (Protect-Ip $n.IPAddress)
            device  = $ifName
            mac     = "$($n.LinkLayerAddress)".Replace('-', ':').ToLower()
            state   = $state
        }) | Out-Null
    }
    return ,$out
}

# ------------------------------------------------------- listeners/connections

function Get-Listeners {
    $out = New-Object System.Collections.Generic.List[object]
    if (-not $hasNetTCPIP) { return ,$out }

    foreach ($l in Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue) {
        $addr = $l.LocalAddress
        $scope = if ($addr -eq '0.0.0.0' -or $addr -eq '::') { 'all-interfaces' }
                 elseif ($addr -like '127.*' -or $addr -eq '::1') { 'loopback' }
                 else { 'specific' }
        $out.Add([ordered]@{
            protocol = 'tcp'
            address  = $addr
            port     = [int]$l.LocalPort
            scope    = $scope
            process  = (Get-ProcName $l.OwningProcess)
            pid      = [int]$l.OwningProcess
        }) | Out-Null
    }

    if (Test-Command 'Get-NetUDPEndpoint') {
        foreach ($u in Get-NetUDPEndpoint -ErrorAction SilentlyContinue) {
            $addr = $u.LocalAddress
            $scope = if ($addr -eq '0.0.0.0' -or $addr -eq '::') { 'all-interfaces' }
                     elseif ($addr -like '127.*' -or $addr -eq '::1') { 'loopback' }
                     else { 'specific' }
            $out.Add([ordered]@{
                protocol = 'udp'
                address  = $addr
                port     = [int]$u.LocalPort
                scope    = $scope
                process  = (Get-ProcName $u.OwningProcess)
                pid      = [int]$u.OwningProcess
            }) | Out-Null
        }
    }
    return ,$out
}

function Get-Connections {
    $out = New-Object System.Collections.Generic.List[object]
    if (-not $hasNetTCPIP) { return ,$out }

    foreach ($c in Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue) {
        $out.Add([ordered]@{
            state          = 'ESTAB'
            local_address  = (Protect-Ip $c.LocalAddress)
            local_port     = [int]$c.LocalPort
            remote_address = (Protect-Ip $c.RemoteAddress)
            remote_port    = [int]$c.RemotePort
            process        = (Get-ProcName $c.OwningProcess)
            pid            = [int]$c.OwningProcess
        }) | Out-Null
    }
    return ,$out
}

# --------------------------------------------------------------- nat/firewall

function Get-Firewall {
    $snat = 0; $dnat = 0; $filter = 0; $readable = $false; $backend = 'windows-firewall'

    if ($hasFirewall) {
        try {
            $rules = @(Get-NetFirewallRule -Enabled True -ErrorAction Stop)
            $filter = $rules.Count
            $readable = $true
        } catch { $readable = $false }
    }

    if ($hasNat) {
        try {
            $snat = @(Get-NetNat -ErrorAction Stop).Count
            $dnat = @(Get-NetNatStaticMapping -ErrorAction SilentlyContinue).Count
        } catch {}
    }

    # Forwarding is per interface on Windows rather than a single global flag.
    $forwarding = $false
    if (Test-Command 'Get-NetIPInterface') {
        $forwarding = @(Get-NetIPInterface -ErrorAction SilentlyContinue |
                        Where-Object { $_.Forwarding -eq 'Enabled' }).Count -gt 0
    }

    [ordered]@{
        backend          = $backend
        readable         = $readable
        snat_rules       = $snat
        dnat_rules       = $dnat
        masquerade_rules = 0
        forward_rules    = 0
        filter_rules     = $filter
        ip_forwarding    = $forwarding
    }
}

# ------------------------------------------------------------------- sessions

function Get-Sessions {
    $out = New-Object System.Collections.Generic.List[object]
    try {
        # `query user` is the only reliable source for RDP session origin, and
        # it is text-only, so it has to be parsed.
        $lines = @(query user 2>$null)
        for ($i = 1; $i -lt $lines.Count; $i++) {
            $f = ($lines[$i] -replace '^\s*>?', '') -split '\s{2,}'
            if ($f.Count -lt 3) { continue }
            $out.Add([ordered]@{
                user   = (Protect-User $f[0].Trim())
                tty    = $f[1].Trim()
                from   = ''
                since  = if ($f.Count -ge 6) { $f[5].Trim() } else { '' }
                remote = ($f[1] -like '*rdp*')
            }) | Out-Null
        }
    } catch {}

    if ($out.Count -eq 0) {
        $out.Add([ordered]@{
            user = (Protect-User $env:USERNAME); tty = 'console'; from = ''
            since = ''; remote = $false
        }) | Out-Null
    }
    return ,$out
}

# ------------------------------------------------------------------------ dns

function Get-Dns {
    $servers = New-Object System.Collections.Generic.List[string]
    if ($hasDnsClient) {
        foreach ($d in Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue) {
            foreach ($s in $d.ServerAddresses) {
                if ($s -and -not $servers.Contains($s)) { $servers.Add((Protect-Ip $s)) | Out-Null }
            }
        }
    }
    $search = @()
    try { $search = @((Get-DnsClientGlobalSetting -ErrorAction Stop).SuffixSearchList) } catch {}

    [ordered]@{ servers = $servers; search = $search }
}

# ------------------------------------------------------------------- assemble

$report = [ordered]@{
    netlens = [ordered]@{
        version   = $NetlensVersion
        generated = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        redacted  = [bool]$Redact
    }
    host         = Get-HostFacts
    capabilities = [ordered]@{
        root       = $elevated
        nettcpip   = $hasNetTCPIP
        netadapter = $hasNetAdapter
        firewall   = $hasFirewall
        nat        = $hasNat
        dnsclient  = $hasDnsClient
        cim        = $hasCim
    }
    interfaces  = Get-Interfaces
    routes      = Get-Routes
    neighbors   = Get-Neighbors
    listeners   = Get-Listeners
    connections = Get-Connections
    firewall    = Get-Firewall
    sessions    = Get-Sessions
    dns         = Get-Dns
    notes       = ,$script:Notes
}

$json = $report | ConvertTo-Json -Depth 8

if ($Stdout) {
    Write-Output $json
    exit 0
}

try {
    # UTF-8 without a BOM -- a BOM makes JSON.parse fail in the browser.
    $target = if ([System.IO.Path]::IsPathRooted($Out)) { $Out }
              else { Join-Path (Get-Location).Path $Out }
    [System.IO.File]::WriteAllText(
        $target, $json, (New-Object System.Text.UTF8Encoding($false)))
} catch {
    Write-Error "netlens: could not write to $Out"
    exit 2
}

$exposed = @($report.listeners | Where-Object { $_.scope -eq 'all-interfaces' }).Count
Write-Host ""
Write-Host "  Network Lens -- report written to $Out"
if (-not $elevated) { Write-Host "  Not elevated, so firewall rules were not read." }
Write-Host "  $exposed listener(s) bound to all interfaces."
Write-Host ""
Write-Host "  Open it at https://surajkr.dev/tools/network-lens"
Write-Host "  Nothing was uploaded. The page reads the file in your browser."
Write-Host ""

exit 0
