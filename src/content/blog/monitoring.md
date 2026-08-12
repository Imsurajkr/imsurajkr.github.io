---
title: "Reading a Linux System with top, htop and bashtop"
description: "Three interactive process monitors, what each one is good for, and the keys worth remembering — sorting by memory, killing a process without hunting for its PID, and seeing disk and network at a glance."
pubDate: 2024-02-15
heroImage: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?ixid=M3wxMDI2MzIyfDB8MXxzZWFyY2h8Mnx8Y29tcHV0ZXIlMjBzY3JlZW4lMjBzZXJ2ZXIlMjBtb25pdG9yaW5nJTIwZGFzaGJvYXJkfGVufDF8MHx8fDE3ODY1Mjg3NzN8MA&ixlib=rb-4.1.0&w=1200&h=630&fit=crop&crop=entropy&q=70&fm=jpg"
heroImageAlt: "turned on monitoring screen"
heroCredit:
  name: "Stephen Dawson"
  profile: "https://unsplash.com/@dawson2406?utm_source=surajkr_dev&utm_medium=referral"
  photo: "https://unsplash.com/photos/turned-on-monitoring-screen-qwtCeJ5cLYs?utm_source=surajkr_dev&utm_medium=referral"
tags:
  - "linux"
  - "monitoring"
---

A guide to interactive system monitoring with `top`, `htop` and `bashtop` — taking control of your system's health and performance.

## Getting started

Before diving in, make sure you have the tools installed. Most Linux distributions ship `top` already; `htop` and `bashtop` are worth adding for a more interactive experience.

Install `htop`:

```bash
sudo apt-get install htop # Debian/Ubuntu
sudo yum install htop     # CentOS/RHEL
sudo dnf install htop     # Fedora
```

Install `bashtop`:

```bash
sudo add-apt-repository ppa:bashtop-monitor/bashtop
sudo apt-get update
sudo apt-get install bashtop
```

## top — the classic

`top` is the granddaddy of system monitoring tools. It gives you a dynamic, real-time view of a running system.

```bash
top
```

Navigating within `top`:

- **Shift + M** — sort by memory usage
- **Shift + P** — sort by CPU usage
- **h** — show help

## htop — the enhanced version

`htop` is `top` with more features: a colourful interface, easier navigation, and the ability to kill a process without first looking up its PID.

```bash
htop
```

Key features:

- Use the arrow keys to navigate.
- Press `F9` to kill a process.
- Press `F2` for setup.

## bashtop — the eye candy

`bashtop` is a resource monitor showing usage and statistics for processor, memory, disks, network and processes. It is the most visually appealing of the three.

```bash
bashtop
```

Highlights:

- Easy to use, with an almost game-like interface.
- Detailed process sorting, including by CPU and memory.
- A responsive UI with mouse support.

## Others worth mentioning

- **Glances** — an all-in-one system monitoring tool.
- **nmon** — performance monitoring for Linux.
- **atop** — for Linux server performance analysis.

## Conclusion

Monitoring is how you keep a system healthy and find out where its performance actually goes. Between `top`, `htop` and `bashtop` you are well equipped to understand and manage what your machine is doing.
