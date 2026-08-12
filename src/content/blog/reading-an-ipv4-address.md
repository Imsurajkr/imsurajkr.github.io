---
title: "Reading an IPv4 Address"
description: "192.168.255.1 belongs to 33 different networks at once, and which one you mean depends entirely on the mask. How prefixes work, which blocks are reserved, and how to split a range without leaving gaps."
pubDate: 2026-08-12
tags:
  - "networking"
---

Ask someone which subnet `192.168.255.1` is in and the honest answer is: all of them. It is in `192.168.255.1/32`, and in `192.168.255.0/24`, and in `192.168.0.0/16`, and in `0.0.0.0/0`. Every one of those is true at the same time. Which one matters depends on the mask the equipment in front of you is configured with.

That is the part that trips people up, so it is worth being precise about what the pieces mean.

## An address is 32 bits wearing a disguise

The dotted-quad form is for humans. `192.168.255.1` is really:

```
11000000 . 10101000 . 11111111 . 00000001
```

Four octets, eight bits each, 32 bits in total — an unsigned number between 0 and 4,294,967,295. `192.168.255.1` is 3,232,300,801. Nothing more.

A **prefix length** — the `/24` in `192.168.255.0/24` — says how many of those bits from the left identify the network. The rest identify a host inside it:

```
192.168.255.0/24
11000000 10101000 11111111 . 00000001
└────── network, 24 bits ──┘ └ host ┘
```

That single fact explains most of what follows. A `/24` fixes the first 24 bits and leaves 8 free, so it holds 2⁸ = 256 addresses. A `/16` fixes 16 and leaves 16 free: 65,536 addresses. Every bit you take from the network side doubles the size of the block.

| Prefix | Addresses | Usable hosts |
| --- | --- | --- |
| /30 | 4 | 2 |
| /29 | 8 | 6 |
| /24 | 256 | 254 |
| /16 | 65,536 | 65,534 |
| /8 | 16,777,216 | 16,777,214 |

"Usable" is two fewer than the total because the first address in a block is the network address and the last is the broadcast address. Neither goes on an interface.

The exception is a `/31`. It has two addresses and no room for that convention, so [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021) says both are usable — which is exactly what you want on a point-to-point link between two routers. A `/32` is a single address, used for loopbacks and host routes.

## Why the mask has to be contiguous

A netmask is the same 32 bits with the network part set to 1:

```
/24 → 255.255.255.0   → 11111111 11111111 11111111 00000000
/26 → 255.255.255.192 → 11111111 11111111 11111111 11000000
```

The ones are always on the left, with no gaps. That is not an aesthetic choice — it is what makes routing cheap. To find the network an address belongs to, a router does one bitwise AND:

```
  11000000 10101000 11111111 00000001   192.168.255.1
& 11111111 11111111 11111111 00000000   /24
  ─────────────────────────────────────
  11000000 10101000 11111111 00000000   192.168.255.0
```

One instruction, no loops. This is also why `255.255.0.255` is not a valid mask, however much someone wishes it were.

## Not every address is up for grabs

Some ranges are spoken for. If you pick from these by accident, things break in ways that are hard to trace back:

| Block | What it is |
| --- | --- |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Private use ([RFC 1918](https://www.rfc-editor.org/rfc/rfc1918)) — yours, never routed on the internet |
| `127.0.0.0/8` | Loopback. The whole /8, not just `127.0.0.1` |
| `169.254.0.0/16` | Link-local. A machine gives itself one of these when DHCP fails |
| `100.64.0.0/10` | Carrier-grade NAT ([RFC 6598](https://www.rfc-editor.org/rfc/rfc6598)) — your ISP's, not yours |
| `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Documentation. Use these in examples instead of someone's real address |
| `198.18.0.0/15` | Benchmarking |
| `224.0.0.0/4` | Multicast |
| `240.0.0.0/4` | Reserved. Most stacks refuse to route it |

Two of these cause real incidents. **`169.254.x.x` on a production host means DHCP failed** — the machine gave up and named itself. And **`100.64.0.0/10` is not private space**, despite looking like it; if you build a network on it you will collide with your ISP's CGNAT the moment traffic leaves the building.

The old Class A/B/C scheme is worth knowing only because people still speak it. "A class C" means a /24 to most people who say it. Classful routing itself has been gone since CIDR arrived in 1993.

## Splitting a block without leaving holes

The practical job is usually the reverse: you have a `/16` for a VPC and need to carve it into subnets across availability zones.

The rule is that subnets have to fall on their own boundaries. A `/26` can start at `.0`, `.64`, `.128` or `.192` — never at `.50`. Splitting a block always halves it:

```
10.0.0.0/16
├── 10.0.0.0/17      32,768 addresses
│   ├── 10.0.0.0/18  16,384
│   └── 10.0.64.0/18 16,384
└── 10.0.128.0/17
```

Every split is exact, so if you keep halving you can never leave a gap or an overlap. This is the honest way to plan address space, and it is why doing it by hand with a calculator app goes wrong — the arithmetic is easy but the boundary rules are unforgiving.

A few things worth deciding before you start carving:

- **Leave room.** A subnet cannot be grown in place later. Allocate the /24s you need now out of a /20 you have reserved, rather than packing them end to end.
- **Watch what the platform takes.** AWS reserves five addresses in every subnet, not two. A `/28` gives you eleven usable, not fourteen.
- **Do not reuse `10.0.0.0/16` for everything.** The day you have to peer two VPCs or connect a partner network, overlapping ranges become somebody's very long weekend.

## Doing it on the page

I built the [visual subnet calculator](/tools/subnet-calculator) for exactly this. You give it a block, click **Divide** to halve a row, and click a bracket in the join column to merge it back. The whole division is encoded in the URL, so you can put the resulting plan in a ticket and whoever opens it sees the same layout.

It also answers the question this post opened with. Paste a single address into **Look up a single address** and it lists every network that address belongs to, from `/32` all the way down to `/0`, along with the reserved block it sits in and what that block is for. From any row you can jump straight into dividing it.

Which brings us back to `192.168.255.1`: it is a private address from `192.168.0.0/16`, class C by the old reckoning, and it is genuinely a member of all 33 networks above it. The mask is what picks one.
