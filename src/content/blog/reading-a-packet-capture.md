---
title: "Finding Out What Your Machine Is Talking To"
description: "Taking a capture with tcpdump, then answering the only question that usually matters: which hosts were talking, how much moved, and which connections never completed."
pubDate: 2026-08-12
heroImage: "https://images.unsplash.com/photo-1680992046626-418f7e910589?ixid=M3wxMDI2MzIyfDB8MXxzZWFyY2h8MXx8c2VydmVyJTIwcm9vbSUyMG5ldHdvcmslMjByYWNrfGVufDF8MHx8fDE3ODY1Mjg3NzB8MA&ixlib=rb-4.1.0&w=1200&h=630&fit=crop&crop=entropy&q=70&fm=jpg"
heroImageAlt: "a rack of electronic equipment in a dark room"
heroCredit:
  name: "Tyler"
  profile: "https://unsplash.com/@tylergm?utm_source=surajkr_dev&utm_medium=referral"
  photo: "https://unsplash.com/photos/a-rack-of-electronic-equipment-in-a-dark-room-OnI_TNcIv9U?utm_source=surajkr_dev&utm_medium=referral"
tags:
  - "networking"
  - "security"
---

Opening a packet capture in Wireshark shows you a list of several hundred thousand rows, sorted by time, one per packet. It is a complete record and a terrible summary. The questions you usually arrived with — who is this machine talking to, what is using all the bandwidth, why does this connection fail — are all answered at the level of *conversations*, not packets.

This post covers taking a capture that will actually be useful, and then reading it.

## Taking the capture

The capture point decides what you can possibly learn. A capture taken on a laptop sees that laptop's traffic. One taken on a switch port without a mirror configured sees broadcast traffic and almost nothing else. Before you debug the network, be sure you are looking at it.

The basic form:

```bash
sudo tcpdump -i eth0 -w capture.pcap
```

Three flags are worth adding by reflex:

```bash
sudo tcpdump -i eth0 -s 0 -n -w capture.pcap
```

- **`-s 0`** captures whole packets. Without it, older tcpdump versions truncate at a snap length and you lose the payload — which is where TLS server names and HTTP headers live. Modern versions default to 262144, which is fine, but being explicit costs nothing.
- **`-n`** skips reverse DNS lookups. Otherwise tcpdump generates its own DNS traffic while capturing, which then appears in the capture.
- **`-w`** writes the raw file rather than printing decoded text. Always capture to a file; decide what to look at afterwards.

Bound the capture so it does not fill the disk:

```bash
# Stop after 200,000 packets
sudo tcpdump -i eth0 -s 0 -n -c 200000 -w capture.pcap

# Or rotate: 10 files of 100 MB each, oldest overwritten
sudo tcpdump -i eth0 -s 0 -n -W 10 -C 100 -w capture.pcap
```

Filter at capture time only when you already know what you are looking for. A filter is a decision you cannot undo later:

```bash
# One host's traffic
sudo tcpdump -i eth0 -s 0 -n host 10.20.4.12 -w capture.pcap

# Everything except your own SSH session, which would otherwise dominate
sudo tcpdump -i eth0 -s 0 -n 'not (tcp port 22 and host 10.0.0.5)' -w capture.pcap
```

That second one matters more than it looks. If you are SSHed into the box you are capturing on, your own session shows up in the capture, and every packet you generate by watching it generates more packets. Exclude yourself.

## What to ask of it

Once you have a file, the useful questions are all aggregate ones. `tshark` answers them from the command line:

```bash
# Who talked to whom, by volume
tshark -r capture.pcap -q -z conv,ip

# The same, broken down by TCP port
tshark -r capture.pcap -q -z conv,tcp

# Protocol breakdown, as a tree with byte counts
tshark -r capture.pcap -q -z io,phs

# Connection attempts that were never answered
tshark -r capture.pcap -Y "tcp.flags.syn==1 && tcp.flags.ack==0"
```

`conv,ip` is the one to reach for first. It collapses those several hundred thousand rows into one line per pair of hosts, with bytes in each direction, sorted by volume. Most investigations end at that table.

## Reading what comes back

A few things are worth knowing about how to interpret it.

**Encrypted does not mean opaque.** TLS hides the payload, not the metadata. The addresses, the ports, the volume and the timing are all in the clear, and so is the `server_name` field in the ClientHello — the hostname the client asked for, sent before encryption begins. A capture can therefore tell you *who* a machine contacted and *how much* moved, even when it cannot tell you what was said. For a machine you are suspicious of, that is usually enough.

**A SYN with no SYN-ACK is the clearest signal in networking.** The client asked to open a connection and got nothing back: a firewall dropping traffic, a service that is not listening, or a route to nowhere. Unlike a traceroute, there is no ambiguity about whether the probe was special-cased. Note that three retried SYNs to the same port are one failed connection, not three — TCP retries the handshake before giving up.

**A reset is different from silence.** An RST means something actively refused you: a closed port, an ACL that rejects rather than drops, or an application that hung up. Silence means nobody answered at all. Different causes, different fixes.

**Byte counts use the on-the-wire length**, so they stay accurate even when the payload was truncated by a snap length. Volume figures are trustworthy in a way payload details are not.

**Cleartext protocols deserve an audit pass.** Anything on port 21, 23, 80, 110, 143, 3306, 5432, 6379 or 11211 is carrying data — often credentials — in a form anyone on the path can read. Including whoever took the capture.

## Watch what you do with the file

A capture is among the most sensitive artefacts you can produce. It contains internal addressing, hostnames, session cookies, and any credential that crossed the wire in the clear. Uploading one to a web service to "just have a quick look" hands all of that to a third party, and captures have a way of outliving the incident that produced them.

If you must share one, `editcap` and `tcprewrite` can trim and anonymise it first. Otherwise keep it local — and use tools that do the same.

## Doing it on the page

Which is why the [PCAP analyzer](/tools/pcap-analyzer) reads the file inside your browser tab and never uploads it. Drop in a `.pcap`, `.pcapng` or `.pcap.gz` and it produces the conversation view directly: a map of which hosts talked to each other, with your own networks on one side and the internet on the other, edges weighted by volume and coloured by whether the traffic was encrypted, cleartext or infrastructure.

Below that are the same tables `tshark -z conv,ip` would give you, plus the things worth flagging without being asked — unencrypted services, handshakes that never completed, resets, hosts talking to an unusual number of peers. Addresses are named from the capture itself, using DNS answers, TLS server names and HTTP `Host` headers, so `93.184.216.34` appears under the name it was reached by, with no lookups performed.

It is the same information `tshark` gives you. It just arrives in the shape of the question you asked.

If what you are chasing is a path problem rather than a traffic problem, [reading a traceroute honestly](/blog/reading-a-traceroute) is the companion to this one.
