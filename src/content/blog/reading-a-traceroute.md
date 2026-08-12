---
title: "What a Traceroute Actually Tells You"
description: "Three stars in the middle of a trace mean nothing. A slow hop is usually not the slow hop. Reading a traceroute for what it says, rather than what it appears to say."
pubDate: 2026-08-12
tags:
  - "networking"
---

A traceroute gets pasted into an incident channel roughly once a week, usually with the words "it dies at hop 7". Most of the time hop 7 is fine, and the trace does not say what the person pasting it thinks it says.

It is worth understanding how the output is produced, because every misreading comes from the same place: assuming a traceroute is a picture of the path, when it is really a pile of replies from different machines answering different questions.

## How the output is made

Traceroute does not ask routers to identify themselves. There is no such request. Instead it abuses the TTL field.

Every IP packet carries a **time to live** — a counter that each router decrements by one. When it hits zero, the router throws the packet away and sends back an ICMP *time exceeded* message. The mechanism exists to stop packets circling forever in a routing loop.

Traceroute weaponises it. It sends a packet with TTL 1, and the first router dutifully reports the packet's death — revealing itself. Then TTL 2, and the second router does the same. Then 3. The list of hops is assembled entirely from these obituaries.

Three consequences follow, and they are the source of almost every wrong conclusion:

1. **Each line comes from a different machine**, answering an entirely separate probe.
2. **Replying is optional.** Nothing obliges a router to send ICMP at all.
3. **The reply travels back over its own return path**, which need not resemble the outbound one.

## Stars in the middle mean nothing

This is the big one:

```
 5  10.20.30.1  12.4 ms  12.1 ms  12.6 ms
 6  * * *
 7  * * *
 8  185.199.108.153  134.2 ms  133.9 ms  134.1 ms
```

Hops 6 and 7 did not answer. Hop 8 did. Since the probe for hop 8 had to pass *through* 6 and 7 to get there, those routers forwarded the traffic perfectly well — they simply declined to send ICMP about it.

That is completely normal. Plenty of operators disable ICMP generation, or rate-limit it hard, because generating those messages costs the control plane real work. Silence in the middle of a trace is a configuration choice, not a fault.

## Silence at the end is not proof of an outage

This one is genuinely ambiguous:

```
 3  fw-edge.corp.example.com  12.0 ms
 4  * * *
 5  * * *
 ...
30  * * *
```

The trace stops and never reaches the destination. That could mean traffic is being dropped. It could equally mean the destination host, or a firewall in front of it, drops traceroute probes while happily serving real traffic. Both look identical here.

The way to tell them apart is to stop using traceroute and start using the protocol you actually care about:

```bash
# Trace using TCP to the real port instead of UDP or ICMP
traceroute -T -p 443 api.example.com

# Or just ask the question directly
nc -vz api.example.com 443
curl -sv https://api.example.com/health
```

If `curl` works and traceroute does not, you have learned something about ICMP filtering and nothing about your service. Escalating on the traceroute alone wastes a network team's afternoon.

## A slow hop is usually not the slow hop

```
 4  10.0.0.1     1.2 ms
 5  10.1.0.1   180.4 ms
 6  10.2.0.1     8.9 ms
```

Hop 5 looks alarming and is almost certainly fine. That 180 ms is the round trip to the router *plus* however long that router took to get around to generating an ICMP reply — a low-priority task handled by its control plane CPU, not by the forwarding hardware that moves your actual traffic.

Hop 6 answering in 8.9 ms is the proof. Traffic passed through hop 5 and came back faster than hop 5's own reply. The router is busy answering you, not slow at routing.

**Latency only matters when it carries through.** If every hop after 5 is also 180 ms, you have found a real increase. A single spike that the next hop does not inherit is noise.

## The return path is invisible

Every number in a traceroute is a round trip: out to the router and back to you. If the return path is congested, or asymmetric, or takes a completely different route, that shows up in the numbers with no way to tell it apart from an outbound problem.

This is why a traceroute from your side and a traceroute from the other side can disagree completely, and both be correct. When the direction matters, you need both.

## Reading a trace, in order

1. **Find the last hop that replied.** That is the furthest point you have any evidence about.
2. **Ask whether it is your destination.** If yes, the path works and you are done. If no, keep going.
3. **Ignore silent hops that later hops answer past.** They forwarded fine.
4. **For a silent tail, confirm with the real protocol** before concluding anything.
5. **Check whether a latency jump persists.** If the next hop is fast again, the jump was control-plane noise.
6. **Note where the addresses change hands** — your LAN, then CGNAT or your ISP, then transit, then the destination's network. Which of those the trouble sits in decides who can actually fix it.

For repeated measurements rather than a single snapshot, `mtr` is the better instrument. It probes continuously and reports per-hop loss, which distinguishes a router that never answers from one that answers 70% of the time.

```bash
mtr --report --report-cycles 50 api.example.com
```

## Doing it on the page

Working through those steps by hand every time is tedious, so I built the [traceroute analyzer](/tools/traceroute-analyzer). Paste output from `traceroute`, Windows `tracert` or `mtr --report` and it identifies the last responding hop, says whether the destination was reached, flags latency jumps that persist versus ones that do not, and tells you which silence is meaningful and which is a router with ICMP turned off.

It runs entirely in the browser, which matters more than it sounds — a traceroute contains your public address and a map of your provider's internal infrastructure, and that is not something to paste into a stranger's server.

If you want to see what a capture of the same conversation looks like at the packet level, that is [the next post](/blog/reading-a-packet-capture).
