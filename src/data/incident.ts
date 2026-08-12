/**
 * The Incident Room content model.
 *
 * A playbook is a decision tree, not an article. Each step states why you are
 * running something before it hands you the command, tells you what in the
 * output actually matters, and then branches on what you saw. Terminal nodes
 * are either a cause you can act on or an honest handover to the next tree.
 *
 * Everything the section renders comes from this file, so adding a playbook is
 * a data change rather than a new page.
 */

export type Domain = 'Linux' | 'Networking' | 'TLS' | 'Kubernetes' | 'Storage' | 'Process';

/** Where a branch leads: another step, or the end of the investigation. */
export interface Branch {
  /** The observation, written the way it appears on screen. */
  when: string;
  /** A step id, or `found:` / `handover:` for a terminal node. */
  then: string;
  /** The conclusion text for a terminal branch. */
  outcome?: string;
  /** What to do about it, for a terminal branch. */
  fix?: string[];
  /** Another playbook to continue in. */
  handoff?: string;
}

export interface Step {
  id: string;
  title: string;
  /** The reason this step exists. Never "run this and see". */
  why: string;
  /** Commands to run, in order. */
  run?: string[];
  /** What in the output decides the next move. */
  look: string;
  /** Something that will bite you if you run this carelessly. */
  caution?: string;
  branches: Branch[];
}

export interface Playbook {
  slug: string;
  title: string;
  /** The symptom as an engineer would say it out loud. */
  symptom: string;
  blurb: string;
  domain: Domain;
  /** Extra words the hub search should match on. */
  keywords: string[];
  /** Roughly how long the tree takes to walk. */
  minutes: number;
  entry: string;
  steps: Step[];
}

// ---------------------------------------------------------------- playbooks

export const playbooks: Playbook[] = [
  // ------------------------------------------------------------- high CPU
  {
    slug: 'high-cpu',
    title: 'CPU is pinned',
    symptom: 'Load average is climbing and everything feels slow',
    blurb:
      'Separate real CPU work from processes stuck waiting on disk, then find the thread actually burning the cycles.',
    domain: 'Linux',
    keywords: ['load average', 'top', 'cpu', 'slow', 'throttling', 'steal'],
    minutes: 6,
    entry: 'shape',
    steps: [
      {
        id: 'shape',
        title: 'Find out what the load is made of',
        why: 'Load average counts processes waiting for disk as well as processes on CPU. A load of 40 with idle CPUs is a storage problem wearing a CPU costume, and chasing it with profilers wastes the outage.',
        run: ['uptime', 'vmstat 1 5', 'top -bn1 | head -20'],
        look: 'In vmstat, the `r` column is processes runnable on CPU and `b` is processes blocked on I/O. Then read the CPU line: `us` user, `sy` system, `wa` iowait, `st` steal.',
        branches: [
          { when: 'us or sy is high, wa near zero', then: 'whichproc' },
          { when: 'wa is high, us is low', then: 'handover:io', handoff: 'disk-full' },
          {
            when: 'st (steal) is above ~10%',
            then: 'found:steal',
            outcome: 'The hypervisor is taking the CPU away from you.',
            fix: [
              'Steal time means a noisy neighbour or an oversubscribed host — the work is not yours.',
              'On a cloud instance, check whether you have exhausted a burst credit balance (T-series on AWS is the classic).',
              'Move the instance, resize it, or move to a dedicated tenancy. No amount of application tuning fixes steal.',
            ],
          },
        ],
      },
      {
        id: 'whichproc',
        title: 'Attribute the CPU to a process, then a thread',
        why: 'A process figure is an aggregate. One runaway thread in a fifty-thread service looks like moderate load until you look per thread, and the fix is completely different.',
        run: [
          'ps -eo pid,ppid,comm,pcpu,pmem,etime --sort=-pcpu | head -15',
          'top -H -p <PID>',
          'ps -L -o pid,tid,pcpu,comm -p <PID> --sort=-pcpu | head',
        ],
        look: 'Whether one thread dominates or the load is spread evenly across all of them. Note the TID of the worst offender.',
        branches: [
          { when: 'One thread is pinned at ~100%', then: 'whatdoing' },
          { when: 'Load is spread evenly across threads', then: 'whatdoing' },
          {
            when: 'No single process accounts for it',
            then: 'found:manysmall',
            outcome: 'The cost is in process churn, not in any one process.',
            fix: [
              'Something is forking constantly — a cron loop, a supervisor restarting a crashing service, or a shell script in a tight loop.',
              'Watch it happen: `execsnoop-bpfcc` if you have bcc tools, otherwise `forkstat`.',
              'Check the restart counters: `systemctl list-units --failed` and `journalctl -p err -S -10min`.',
            ],
          },
        ],
      },
      {
        id: 'whatdoing',
        title: 'Ask the thread what it is doing',
        why: 'You now know where the cycles go but not why. A stack sample separates a genuine hot loop from a syscall storm, and those have opposite fixes.',
        run: [
          'cat /proc/<PID>/status | grep -E "State|Threads|voluntary"',
          'strace -c -f -p <PID>   # ctrl-c after ~10s for a syscall histogram',
          'perf top -p <PID>',
        ],
        look: 'In the strace summary, whether one syscall dominates the count. In perf, whether one symbol dominates the samples.',
        caution:
          'strace stops the process on every syscall and can slow a busy service by an order of magnitude. Attach briefly, and never to a latency-sensitive process in production without saying so first.',
        branches: [
          {
            when: 'One syscall dominates (futex, epoll_wait, read)',
            then: 'found:syscall',
            outcome: 'The thread is spinning on a syscall rather than computing.',
            fix: [
              'A futex storm is lock contention — threads fighting over a mutex. Reduce concurrency or shrink the critical section.',
              'Constant epoll_wait with no work is usually a busy-poll misconfiguration or a zero timeout in the event loop.',
              'Heavy read/write on small buffers means an unbuffered I/O path. Look for a missing buffer in the application code.',
            ],
          },
          {
            when: 'perf shows a hot application symbol',
            then: 'found:hotloop',
            outcome: 'A genuine hot code path.',
            fix: [
              'Capture it properly: `perf record -F 99 -p <PID> -g -- sleep 30` then `perf script | stackcollapse-perf.pl | flamegraph.pl > cpu.svg`.',
              'Take the flame graph to whoever owns the code — it names the function, which ends the argument quickly.',
              'If it is a regression, correlate with the last deploy time before assuming it is load-related.',
            ],
          },
          {
            when: 'Kernel symbols dominate',
            then: 'found:kernel',
            outcome: 'Time is going into the kernel, not your code.',
            fix: [
              'Heavy softirq or ksoftirqd usually means packet processing — a traffic flood, or interrupts pinned to one core.',
              'Check interrupt distribution with `cat /proc/interrupts` and consider enabling RPS/RSS across cores.',
              'Heavy kswapd means memory pressure, not CPU. Continue in the memory playbook.',
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- memory
  {
    slug: 'memory-pressure',
    title: 'Memory is disappearing',
    symptom: 'Free memory is falling, or something just got killed',
    blurb:
      'Tell cache from genuine usage, find what is growing, and read the OOM killer’s own account of what it did.',
    domain: 'Linux',
    keywords: ['oom', 'memory leak', 'swap', 'rss', 'cache', 'killed'],
    minutes: 7,
    entry: 'real',
    steps: [
      {
        id: 'real',
        title: 'Work out whether memory is actually low',
        why: 'Linux uses free memory for page cache on purpose, so "free is nearly zero" is normal and healthy. The number that matters is `available`, which accounts for cache the kernel can reclaim on demand.',
        run: ['free -h', 'cat /proc/meminfo | grep -E "MemTotal|MemAvailable|Dirty|Writeback|Swap"'],
        look: '`available` against `total`. Cache being large is fine. Swap being used at all on a latency-sensitive box is a warning.',
        branches: [
          { when: 'available is low (under ~10%)', then: 'whogrows' },
          {
            when: 'available is healthy, cache is large',
            then: 'found:cacheok',
            outcome: 'Nothing is wrong with memory.',
            fix: [
              'Page cache is doing its job. Do not "fix" it by dropping caches — that just makes the next reads slow.',
              'If something still feels slow, the bottleneck is elsewhere. Go back to the CPU or storage trees.',
            ],
          },
          { when: 'Swap is filling and the box is thrashing', then: 'whogrows' },
        ],
      },
      {
        id: 'whogrows',
        title: 'Find what is holding the memory',
        why: 'RSS on its own double-counts shared pages across processes. PSS splits shared memory fairly between them, which is the number to argue with.',
        run: [
          'ps -eo pid,comm,rss,vsz --sort=-rss | head -15',
          'smem -tk -s pss 2>/dev/null | tail -15   # PSS, if smem is installed',
          'cat /proc/<PID>/status | grep -E "VmRSS|VmSwap"',
        ],
        look: 'Whether one process holds most of it, and whether its RSS grows steadily when you repeat the command a minute later.',
        branches: [
          { when: 'One process is large and still growing', then: 'leakshape' },
          { when: 'One process is large but stable', then: 'found:sized', outcome: 'The service is simply sized larger than the box.', fix: ['Nothing is leaking — the working set genuinely exceeds what this machine has.', 'Cap it explicitly rather than letting the OOM killer decide: a systemd `MemoryMax=`, a container limit, or a JVM `-Xmx`.', 'An unbounded cache inside the application is the usual reason the working set is bigger than expected.'] },
          { when: 'Many processes, none dominant', then: 'found:fork', outcome: 'Process count is the problem, not any single process.', fix: ['Count them: `ps -e --no-headers | wc -l`, and group by name with `ps -eo comm | sort | uniq -c | sort -rn | head`.', 'A worker pool with no ceiling, or a supervisor restart loop, is the usual cause.'] },
        ],
      },
      {
        id: 'leakshape',
        title: 'Find out where inside the process it is going',
        why: 'A growing RSS could be the heap, a memory-mapped file, or thread stacks. The map tells you which, and that decides who owns the bug.',
        run: [
          'pmap -x <PID> | sort -k3 -n | tail -20',
          'cat /proc/<PID>/smaps_rollup',
          'ls /proc/<PID>/fd | wc -l   # file descriptors leak alongside memory',
        ],
        look: 'Whether the growth is in `[heap]`, in an anonymous mapping, or in a mapped file. A climbing fd count alongside it is a strong signal.',
        branches: [
          {
            when: 'Heap or anonymous memory is growing',
            then: 'found:leak',
            outcome: 'An application-level leak.',
            fix: [
              'Get a heap profile from the runtime rather than guessing: pprof for Go, tracemalloc for Python, a heap dump for the JVM, valgrind or ASAN for native code.',
              'Correlate the start of the growth with a deploy — `journalctl -u <unit> -S -7d | grep -i start`.',
              'Stop the bleeding first with a memory cap and a scheduled restart, then fix the code. Restarts are a bandage, not a resolution.',
            ],
          },
          {
            when: 'Thread count is climbing too',
            then: 'found:threads',
            outcome: 'Thread leak — each thread costs its own stack.',
            fix: [
              'Default stack is 8 MB of virtual address space per thread; a few thousand leaked threads is real memory.',
              'Count over time: `ls /proc/<PID>/task | wc -l`.',
              'Almost always an unbounded thread pool, or threads created per request and never joined.',
            ],
          },
          {
            when: 'Something was already killed',
            then: 'oomlog',
          },
        ],
      },
      {
        id: 'oomlog',
        title: 'Read the OOM killer’s report',
        why: 'The kernel logs exactly which process it chose, why, and what memory looked like at that moment. It is the most direct evidence available and people routinely ignore it.',
        run: [
          'dmesg -T | grep -i -A 20 "out of memory"',
          'journalctl -k -S -1h | grep -i -E "oom|killed process"',
          'grep -i oom /var/log/syslog | tail',
        ],
        look: 'The `Killed process <pid> (<name>) total-vm:… anon-rss:…` line, and the score table above it showing every candidate.',
        branches: [
          {
            when: 'The killed process is the one you expected',
            then: 'found:oom',
            outcome: 'The kernel ran out of memory and killed the largest offender.',
            fix: [
              'anon-rss in the kill line is what the process actually held — compare it against the limit to see how far over it went.',
              'Set an explicit limit so the process dies predictably instead of taking a neighbour with it.',
              'On Kubernetes this surfaces as OOMKilled — continue in that playbook for the container-specific view.',
            ],
          },
          {
            when: 'An unrelated process was killed',
            then: 'found:oomvictim',
            outcome: 'The OOM killer picked a victim by score, not by blame.',
            fix: [
              'oom_score favours large, recent, low-privilege processes — the guilty party often survives.',
              'Protect the important one: `echo -1000 > /proc/<PID>/oom_score_adj`, or `OOMScoreAdjust=` in the systemd unit.',
              'Then go back and cap whatever actually consumed the memory.',
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ disk full
  {
    slug: 'disk-full',
    title: 'No space left on device',
    symptom: 'Writes are failing, or the disk is full and du disagrees with df',
    blurb:
      'Find the space, including the two classic cases where it is invisible: deleted files still held open, and exhausted inodes.',
    domain: 'Storage',
    keywords: ['disk full', 'df', 'du', 'inode', 'no space', 'ENOSPC', 'deleted file'],
    minutes: 5,
    entry: 'which',
    steps: [
      {
        id: 'which',
        title: 'Find which filesystem is full, and whether it is space or inodes',
        why: 'ENOSPC has two causes. A filesystem with free bytes can still refuse writes because it has run out of inodes, and du will never show you that.',
        run: ['df -h', 'df -i'],
        look: 'Compare the two outputs. Use% at 100% in `df -h` is space; Use% at 100% in `df -i` is inodes.',
        branches: [
          { when: 'Space is full (df -h at 100%)', then: 'ducheck' },
          {
            when: 'Inodes are full (df -i at 100%)',
            then: 'found:inodes',
            outcome: 'Out of inodes — millions of tiny files.',
            fix: [
              'Find the directories holding them: `find /var -xdev -type f | cut -d/ -f1-4 | sort | uniq -c | sort -rn | head`.',
              'Usual culprits: session files, unrotated per-request logs, mail spools, a cache directory with no eviction.',
              'Deleting files frees inodes immediately. Growing the inode count means recreating the filesystem, so fix the producer.',
            ],
          },
          {
            when: 'Everything looks fine in df',
            then: 'found:wrongfs',
            outcome: 'You are looking at the wrong mount.',
            fix: [
              'The failing path may be on a different filesystem than you think — check with `df -h /the/actual/path`.',
              'In a container, the writable layer and any volume are separate filesystems with separate limits.',
              'A read-only remount also produces write failures: `mount | grep " ro,"` and check dmesg for filesystem errors.',
            ],
          },
        ],
      },
      {
        id: 'ducheck',
        title: 'Walk the tree for the space',
        why: 'du measures files that exist in the directory tree. Doing it per filesystem avoids counting other mounts and wasting minutes on network shares.',
        run: [
          'du -xh --max-depth=1 / 2>/dev/null | sort -rh | head -15',
          'du -xh --max-depth=1 /var 2>/dev/null | sort -rh | head',
          'find / -xdev -type f -size +1G -exec ls -lh {} + 2>/dev/null | head',
        ],
        look: 'Whether du’s total roughly matches what df reports as used. A large gap is the tell for the next step.',
        caution:
          '`-x` keeps du on one filesystem. Without it you will walk /proc, /sys and any NFS mount, and the numbers will be meaningless.',
        branches: [
          {
            when: 'du finds the space',
            then: 'found:found',
            outcome: 'Ordinary large files.',
            fix: [
              'Logs are the usual answer. Check rotation is actually working: `logrotate -d /etc/logrotate.conf`.',
              'Truncate rather than delete anything a process still has open: `: > /var/log/big.log` — deleting it will not free the space.',
              'On a container host, `docker system df` then `docker system prune` reclaims image and layer space.',
            ],
          },
          { when: 'du total is much smaller than df used', then: 'deleted' },
        ],
      },
      {
        id: 'deleted',
        title: 'Look for deleted files still held open',
        why: 'Unlinking a file removes the directory entry, but the blocks are only freed when the last file descriptor closes. A process writing to a log someone already deleted holds the space indefinitely, and du cannot see it because the file has no name.',
        run: [
          'lsof +L1 2>/dev/null | head -20',
          'lsof -nP 2>/dev/null | grep -i deleted | head',
          'ls -l /proc/<PID>/fd | grep deleted',
        ],
        look: 'The `(deleted)` marker and the SIZE column. The NLINK column of 0 in `lsof +L1` is the same thing said precisely.',
        branches: [
          {
            when: 'A deleted file is still open and large',
            then: 'found:deleted',
            outcome: 'Space is held by a deleted-but-open file.',
            fix: [
              'The clean fix is to restart or signal the holding process so it closes the descriptor.',
              'To reclaim without a restart, truncate through the proc entry: `: > /proc/<PID>/fd/<FD>`.',
              'Then fix the cause — something deleted a log out from under a running process instead of rotating it with copytruncate or a post-rotate signal.',
            ],
          },
          {
            when: 'Nothing deleted, gap remains',
            then: 'found:hidden',
            outcome: 'Space is hidden under a mount point or in reserved blocks.',
            fix: [
              'Files can be written to a directory before a filesystem is mounted over it. Check by bind-mounting the root elsewhere: `mount --bind / /mnt && du -xh --max-depth=1 /mnt`.',
              'ext4 reserves 5% for root by default: `tune2fs -m 1 /dev/sdX` recovers most of it on a data volume.',
              'Snapshots on LVM, ZFS or btrfs consume space invisible to df on the mounted filesystem.',
            ],
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------- process stuck
  {
    slug: 'process-stuck',
    title: 'A process is stuck',
    symptom: 'It is running but doing nothing, and will not stop',
    blurb:
      'Read the process state, find what it is blocked on, and know which states cannot be killed and why.',
    domain: 'Process',
    keywords: ['hung', 'defunct', 'zombie', 'uninterruptible', 'D state', 'kill -9', 'strace'],
    minutes: 6,
    entry: 'state',
    steps: [
      {
        id: 'state',
        title: 'Read the process state',
        why: 'The state letter tells you immediately whether the process can be signalled at all. Sending kill -9 to a D-state process does nothing, and knowing that saves an hour of confusion.',
        run: ['ps -o pid,stat,wchan:30,comm,etime -p <PID>', 'cat /proc/<PID>/status | grep -E "State|SigPnd|SigBlk"'],
        look: 'The STAT letter: R running, S interruptible sleep, D uninterruptible sleep, Z zombie, T stopped. WCHAN names the kernel function it is parked in.',
        branches: [
          { when: 'D — uninterruptible sleep', then: 'found:dstate', outcome: 'Blocked in the kernel, waiting on I/O.', fix: ['D state cannot be interrupted, by SIGKILL or anything else. The process leaves it when the I/O completes or errors out.', 'WCHAN names the wait. Anything NFS-related means the server or the network is gone — check the mount and dmesg.', 'Look for hardware trouble: `dmesg -T | grep -iE "i/o error|ata|nvme|timeout"`.', 'The honest options are fixing the storage, or rebooting. Killing is not among them.'] },
          { when: 'Z — zombie', then: 'found:zombie', outcome: 'Already dead, waiting for its parent to reap it.', fix: ['A zombie holds no memory or CPU — only a process table entry. A handful are harmless.', 'The bug is in the parent, which is not calling wait(). Find it: `ps -o ppid= -p <PID>`.', 'Killing the zombie does nothing; it is already dead. Restart or signal the parent, and init will adopt and reap the orphans.'] },
          { when: 'S or R — but making no progress', then: 'blocked' },
          { when: 'T — stopped', then: 'found:stopped', outcome: 'Suspended by a signal.', fix: ['Something sent SIGSTOP or SIGTSTP — often a ctrl-Z in a shell that then exited, or a debugger that detached badly.', 'Resume it with `kill -CONT <PID>`.'] },
        ],
      },
      {
        id: 'blocked',
        title: 'Find what it is waiting for',
        why: 'A process that is alive but idle is nearly always waiting on something outside itself: a lock, a socket that will never answer, or a child that never exits.',
        run: [
          'strace -p <PID> -f -tt   # ctrl-c after a few seconds',
          'cat /proc/<PID>/stack    # kernel stack, needs root',
          'ls -l /proc/<PID>/fd | tail -20',
          'cat /proc/<PID>/wchan; echo',
        ],
        look: 'The syscall it is parked in. `read` on a socket fd, `futex`, `flock`, and `wait4` each point somewhere completely different.',
        branches: [
          {
            when: 'Blocked in read/recvfrom on a socket',
            then: 'found:netwait',
            outcome: 'Waiting for a reply that is not coming.',
            fix: [
              'Identify the peer: `ss -tnp | grep <PID>` gives the remote address of that connection.',
              'A connection in ESTABLISHED with a growing Recv-Q on the far side means the peer accepted and then stopped answering.',
              'The application is missing a socket timeout. That is the real bug — continue in the port-unreachable tree for the network side.',
            ],
          },
          {
            when: 'Blocked in futex or flock',
            then: 'found:lock',
            outcome: 'Waiting on a lock somebody else holds.',
            fix: [
              'For a file lock, find the holder: `lsof <lockfile>` or `fuser -v <lockfile>`.',
              'A stale lock file from a process that died badly is the common case — remove it only once you have confirmed no live process holds it.',
              'For futex, it is in-process mutex contention. You need a thread dump from the runtime, not a system tool.',
            ],
          },
          {
            when: 'Blocked in wait4',
            then: 'found:child',
            outcome: 'Waiting for a child that has not exited.',
            fix: [
              'Find the children: `ps --ppid <PID>`, or the whole tree with `pstree -p <PID>`.',
              'Investigate the child instead — it is the one actually stuck. Restart this tree with the child’s PID.',
            ],
          },
          {
            when: 'strace shows a busy loop, not a block',
            then: 'handover:cpu',
            handoff: 'high-cpu',
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------- port unreachable
  {
    slug: 'port-unreachable',
    title: 'Cannot reach a port',
    symptom: 'Connection refused, timed out, or hanging',
    blurb:
      'Work outwards from the process to the socket to the firewall. The distinction between refused and timed out narrows it enormously.',
    domain: 'Networking',
    keywords: ['connection refused', 'timeout', 'ss', 'netstat', 'firewall', 'listening', 'nc'],
    minutes: 7,
    entry: 'symptom',
    steps: [
      {
        id: 'symptom',
        title: 'Read the failure mode precisely',
        why: 'Refused and timed out are different diagnoses. Refused means a machine answered with an RST — something is reachable. Timed out means nothing answered at all, which points at a firewall silently dropping packets or a route that goes nowhere.',
        run: [
          'nc -vz <host> <port>',
          'curl -sv --connect-timeout 5 telnet://<host>:<port>',
          'time nc -vz <host> <port>   # a ~5s hang before failure is a drop, not a refusal',
        ],
        look: 'The exact wording. "Connection refused" is immediate; "Connection timed out" takes seconds and then gives up.',
        branches: [
          { when: 'Connection refused (immediate)', then: 'listening' },
          { when: 'Connection timed out (hangs)', then: 'path' },
          { when: 'It connects fine from here', then: 'found:elsewhere', outcome: 'The port is reachable from this vantage point.', fix: ['The problem is where the client is, not where the server is. Run the same test from the machine that is actually failing.', 'Security groups, network policies and host firewalls are all source-address dependent — reachable from one subnet and not another is completely normal.'] },
        ],
      },
      {
        id: 'listening',
        title: 'Check what is listening, and on which address',
        why: 'A service bound to 127.0.0.1 refuses every connection from outside the machine while looking perfectly healthy in its own logs. This is the single most common cause of a refused connection.',
        run: [
          'ss -tlnp | grep <port>',
          'ss -tlnp   # everything listening',
          'lsof -nP -iTCP:<port> -sTCP:LISTEN',
        ],
        look: 'The Local Address column. `127.0.0.1:8080` is loopback only. `0.0.0.0:8080` or `*:8080` is every interface. `[::]:8080` is IPv6, which may or may not also cover IPv4.',
        branches: [
          {
            when: 'Bound to 127.0.0.1 only',
            then: 'found:loopback',
            outcome: 'Listening on loopback, so it is unreachable from anywhere else.',
            fix: [
              'Change the bind address to 0.0.0.0 in the service config — it is usually a `bind`, `listen` or `host` setting.',
              'Docker: publishing with `-p 127.0.0.1:8080:8080` produces exactly this from outside the host.',
              'Bind deliberately rather than reflexively. If it should only be local, the fix may be a reverse proxy instead.',
            ],
          },
          {
            when: 'Nothing is listening on that port',
            then: 'found:notrunning',
            outcome: 'There is no server there.',
            fix: [
              'Check the unit is actually up: `systemctl status <unit>` and `journalctl -u <unit> -n 50 --no-pager`.',
              'A service that failed to bind usually says so and exits — look for "address already in use" or a permissions error on a port below 1024.',
              'Confirm the port number itself. Reading it from the running config beats trusting the documentation.',
            ],
          },
          { when: 'Bound to 0.0.0.0 and still refused from outside', then: 'path' },
        ],
      },
      {
        id: 'path',
        title: 'Test the path rather than the service',
        why: 'A silent drop is a firewall’s signature. Establishing where in the path the packets stop tells you whose firewall to argue with.',
        run: [
          'traceroute -T -p <port> <host>',
          'ping -c 3 <host>   # ICMP may be blocked even when TCP is fine',
          'curl -sv --connect-timeout 5 https://<host>:<port> 2>&1 | head -20',
        ],
        look: 'How far the TCP trace gets before it stops. Compare with an ICMP ping — they can disagree, and TCP is the one that matters.',
        branches: [
          { when: 'Stops at a known firewall or edge device', then: 'found:firewall', outcome: 'Something in the path is dropping the packets.', fix: ['Check the local firewall first: `iptables -L -n -v` or `nft list ruleset`, and `firewall-cmd --list-all` where firewalld is in use.', 'On a cloud instance, check the security group and the network ACL — the ACL is stateless and needs the return path allowed explicitly.', 'On Kubernetes, a NetworkPolicy denies by default once any policy selects the pod.'] },
          { when: 'Gets all the way to the host', then: 'hostfw' },
          { when: 'Does not leave your own network', then: 'handover:dns', handoff: 'dns-failure' },
        ],
      },
      {
        id: 'hostfw',
        title: 'Check the host firewall and the socket backlog',
        why: 'Packets can arrive at the machine and still be dropped by its own firewall, or accepted into a backlog that the application never drains. Both look like a hang from outside.',
        run: [
          'iptables -L INPUT -n -v --line-numbers',
          'nft list ruleset 2>/dev/null | head -40',
          'ss -tln | grep <port>   # Recv-Q against Send-Q on a listening socket is the accept backlog',
          'netstat -s | grep -iE "listen|overflow|drop"',
        ],
        look: 'Non-zero packet counts on a DROP rule, and "listen queue overflowed" in the netstat statistics.',
        branches: [
          { when: 'A DROP rule is counting packets', then: 'found:hostfw', outcome: 'The host firewall is dropping the traffic.', fix: ['The counters name the rule. Allow the port explicitly rather than flushing the whole ruleset in a hurry.', 'Check rule order — a broad DROP earlier in the chain wins over a specific ACCEPT later.'] },
          { when: 'Listen queue is overflowing', then: 'found:backlog', outcome: 'The application is not accepting connections fast enough.', fix: ['The kernel is queueing connections the application never picks up — it is busy, blocked, or its worker pool is exhausted.', 'Raise the ceiling as a stopgap: `net.core.somaxconn` and the application’s own backlog argument.', 'The real fix is upstream — continue in the CPU or stuck-process tree to find why accept() is not being called.'] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ DNS failure
  {
    slug: 'dns-failure',
    title: 'DNS is not resolving',
    symptom: 'Name or service not known, or the wrong address comes back',
    blurb:
      'Separate the resolver from the record, and find out which of the several DNS paths on a modern machine is actually being used.',
    domain: 'Networking',
    keywords: ['dns', 'dig', 'nslookup', 'resolv.conf', 'nxdomain', 'servfail', 'systemd-resolved'],
    minutes: 6,
    entry: 'reso',
    steps: [
      {
        id: 'reso',
        title: 'Find out who is answering',
        why: 'A modern Linux box may have systemd-resolved, an /etc/hosts entry, an NSS module and a container resolver all in play. Testing with dig alone can give a different answer than the application gets, and then you debug the wrong thing.',
        run: [
          'cat /etc/resolv.conf',
          'resolvectl status 2>/dev/null | head -30',
          'getent hosts <name>    # the path the application actually takes',
          'dig +short <name>      # straight to the DNS server, bypassing NSS',
        ],
        look: 'Whether getent and dig agree. If they disagree, the answer is not coming from DNS at all.',
        branches: [
          { when: 'getent and dig disagree', then: 'found:nss', outcome: 'Something ahead of DNS is answering.', fix: ['Check /etc/hosts first — a stale entry there beats DNS every time.', 'Read the order in /etc/nsswitch.conf: `hosts: files dns` means files win.', 'In a container, /etc/hosts is written by the runtime and may carry entries you did not put there.'] },
          { when: 'Both fail the same way', then: 'query' },
          { when: 'Both work here', then: 'found:apponly', outcome: 'Resolution works at the system level.', fix: ['The application may be using its own resolver that ignores /etc/resolv.conf — Go and the JVM both have caching behaviours worth knowing about.', 'The JVM caches DNS, historically forever for successful lookups: check `networkaddress.cache.ttl`.', 'Confirm what the application actually sees by resolving from inside it, or by watching port 53 with tcpdump.'] },
        ],
      },
      {
        id: 'query',
        title: 'Read the response code',
        why: 'NXDOMAIN and SERVFAIL are entirely different failures. One says the name does not exist, the other says the server could not answer — and only one of them is your problem to fix.',
        run: [
          'dig <name>',
          'dig <name> @8.8.8.8    # compare against a public resolver',
          'dig +trace <name>      # walk it from the root',
        ],
        look: 'The `status:` field in the header. NOERROR with an empty answer section is its own case — the name exists but has no record of that type.',
        branches: [
          { when: 'NXDOMAIN', then: 'found:nxdomain', outcome: 'The name genuinely does not exist.', fix: ['Check for a typo, and for a trailing search-domain surprise — `dig name.` with the dot forces an absolute lookup.', '`search` in resolv.conf appends domains to unqualified names, which produces confusing NXDOMAINs in Kubernetes especially.', 'If it should exist, the record was never created or was deleted at the authoritative server.'] },
          { when: 'SERVFAIL', then: 'found:servfail', outcome: 'The resolver could not complete the lookup.', fix: ['Often DNSSEC validation failing on a broken zone: test with `dig +cd <name>` to bypass validation and compare.', 'Could equally be the upstream resolver being unreachable — check reachability of the servers in resolv.conf on port 53.', '`dig +trace` shows which delegation step breaks.'] },
          { when: 'REFUSED', then: 'found:refused', outcome: 'The server declined to answer you.', fix: ['You are querying a server that does not serve you — an authoritative-only server that does not do recursion, or an ACL that excludes your address.', 'Point at the correct resolver for your network.'] },
          { when: 'NOERROR but the answer is wrong or empty', then: 'found:stale', outcome: 'A record exists, but not the one you want.', fix: ['An empty answer with NOERROR means the name exists with a different record type — check A against AAAA explicitly.', 'A stale answer is caching: compare TTLs, and query the authoritative server directly to see the truth.', 'On Kubernetes, check whether the Service actually has endpoints — a headless Service with no ready pods resolves to nothing.'] },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- TLS failure
  {
    slug: 'tls-failure',
    title: 'TLS handshake is failing',
    symptom: 'Certificate errors, handshake failures, or a refused client certificate',
    blurb:
      'Get the server to tell you what it is presenting, then work through name, chain, expiry, protocol and client certificates in the order they fail.',
    domain: 'TLS',
    keywords: ['ssl', 'certificate', 'handshake', 'x509', 'mtls', 'openssl s_client', 'expired'],
    minutes: 8,
    entry: 'sclient',
    steps: [
      {
        id: 'sclient',
        title: 'Ask the server what it presents',
        why: 'Client error messages are summaries. s_client shows the actual chain, the negotiated protocol and the verify result, which usually names the problem outright.',
        run: [
          'openssl s_client -connect <host>:443 -servername <host> </dev/null',
          'openssl s_client -connect <host>:443 -servername <host> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName',
        ],
        look: 'The `Verify return code:` line at the bottom, the certificate chain above it, and the negotiated protocol and cipher.',
        caution:
          'Without `-servername` you get whatever default certificate the server has, which on a shared host is a different certificate entirely and sends you chasing a mismatch that does not exist.',
        branches: [
          { when: 'verify code 10 — certificate has expired', then: 'found:expired', outcome: 'Expired certificate.', fix: ['Confirm the dates: `openssl x509 -noout -dates`. Check the clock on both ends too — a wrong client clock produces the same error.', 'Renew and reload. Reload matters: nginx and HAProxy hold the old certificate in memory until told otherwise.', 'Then fix the renewal automation, because this will happen again on the same schedule.'] },
          { when: 'verify code 18/19 — self-signed or untrusted root', then: 'chain' },
          { when: 'verify code 20/21 — unable to get local issuer', then: 'chain' },
          { when: 'Hostname mismatch', then: 'found:name', outcome: 'The certificate is not valid for the name you asked for.', fix: ['Browsers match on SAN and ignore CN entirely. Read the SANs: `openssl x509 -noout -ext subjectAltName`.', 'Wildcards match exactly one label: *.example.com covers a.example.com but not a.b.example.com.', 'On a shared address, the wrong certificate usually means SNI is not being sent or not being honoured.'] },
          { when: 'handshake failure, no certificate shown', then: 'proto' },
          { when: 'The server asks for a client certificate', then: 'mtls' },
        ],
      },
      {
        id: 'chain',
        title: 'Check the chain the server sends',
        why: 'The most common TLS misconfiguration is a server sending only its leaf certificate. Browsers often paper over it by fetching the intermediate; curl, Java and Go usually do not, which is why "it works in my browser" and the API call fails.',
        run: [
          'openssl s_client -connect <host>:443 -servername <host> -showcerts </dev/null',
          'openssl s_client -connect <host>:443 -servername <host> </dev/null 2>&1 | grep -A3 "Certificate chain"',
          'openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt -untrusted chain.pem cert.pem',
        ],
        look: 'How many certificates come back. A leaf plus at least one intermediate is normal; a lone leaf for a publicly-issued certificate is the bug.',
        branches: [
          { when: 'Only the leaf is sent', then: 'found:chain', outcome: 'Incomplete chain.', fix: ['Concatenate leaf then intermediates into the file the server serves — order matters, leaf first.', 'For nginx, `ssl_certificate` must be the full chain file, not just the certificate. This trips people up every time.', 'Verify from outside afterwards rather than trusting a reload message.'] },
          { when: 'Chain is complete but the root is not trusted', then: 'found:privateca', outcome: 'Issued by a CA the client does not trust.', fix: ['Normal for an internal CA. The client needs the root: `curl --cacert ca.pem`, or install it into the system trust store.', 'For the JVM the store is separate — import with keytool rather than expecting it to read the OS store.', 'In a container, the base image may have no CA bundle at all — install ca-certificates.'] },
        ],
      },
      {
        id: 'proto',
        title: 'Check protocol and cipher agreement',
        why: 'A handshake that fails before any certificate appears is usually the two sides failing to agree on a protocol version or cipher — increasingly common as TLS 1.0 and 1.1 get switched off.',
        run: [
          'openssl s_client -connect <host>:443 -tls1_2 </dev/null 2>&1 | head -5',
          'openssl s_client -connect <host>:443 -tls1_3 </dev/null 2>&1 | head -5',
          'nmap --script ssl-enum-ciphers -p 443 <host>',
        ],
        look: 'Which versions complete a handshake. "no protocols available" or "wrong version number" names the problem directly.',
        branches: [
          { when: 'Only older TLS works', then: 'found:oldtls', outcome: 'The server is stuck on a deprecated protocol.', fix: ['Enable TLS 1.2 and 1.3 on the server. Modern clients refuse 1.0 and 1.1 outright.', 'If you cannot change the server, you have a temporary client-side workaround and a permanent problem.'] },
          { when: 'Only newer TLS works and the client is old', then: 'found:newtls', outcome: 'The client is too old for the server.', fix: ['An old JVM, an old curl or an ancient OpenSSL may not speak TLS 1.2 with modern ciphers.', 'Check what the client actually supports: `openssl version` and `curl -V`.', 'Upgrade the client. Weakening the server to accommodate it is a decision to make deliberately, not by accident.'] },
        ],
      },
      {
        id: 'mtls',
        title: 'Work through the mutual TLS handshake',
        why: 'mTLS adds a second certificate in the other direction, and the failure messages are notoriously unhelpful. Nearly all of it comes down to three things: the right extended key usage, a chain the server trusts, and the client actually sending it.',
        run: [
          'openssl s_client -connect <host>:443 -cert client.crt -key client.key -CAfile ca.crt </dev/null',
          'openssl x509 -in client.crt -noout -ext extendedKeyUsage',
          'openssl verify -CAfile ca.crt client.crt',
          'openssl s_client -connect <host>:443 </dev/null 2>&1 | grep -i "acceptable client certificate"',
        ],
        look: 'Whether the EKU includes clientAuth, whether verify passes against the CA the server trusts, and which CA names the server says it will accept.',
        branches: [
          { when: 'EKU has no clientAuth', then: 'found:eku', outcome: 'The certificate is not usable as a client certificate.', fix: ['A client certificate needs clientAuth in its extended key usage. A server certificate with only serverAuth will be refused.', 'Reissue with the right EKU — check the CA profile that produced it.', 'Inspect any certificate quickly with the Key & Certificate Inspector on this site.'] },
          { when: 'Server does not list your CA as acceptable', then: 'found:catrust', outcome: 'The server does not trust the CA that issued your certificate.', fix: ['The acceptable CA list in the CertificateRequest is the server telling you exactly what it will accept.', 'Add your CA to the server’s client trust bundle — `ssl_client_certificate` in nginx, `SSLCACertificateFile` in Apache.'] },
          { when: 'Key and certificate do not match', then: 'found:keymatch', outcome: 'The key does not belong to the certificate.', fix: ['Compare the public halves: `openssl pkey -in client.key -pubout | diff - <(openssl x509 -in client.crt -pubkey -noout)`.', 'Identical output means they match. The Key & Certificate Inspector on this site does the same comparison in a browser.'] },
        ],
      },
    ],
  },

  // ------------------------------------------------------- permission denied
  {
    slug: 'permission-denied',
    title: 'Permission denied',
    symptom: 'Access refused despite the permissions looking correct',
    blurb:
      'Walk the whole path, then the layers most people forget: ACLs, SELinux, capabilities, mount options and namespaces.',
    domain: 'Linux',
    keywords: ['EACCES', 'selinux', 'acl', 'chmod', 'umask', 'capabilities', 'noexec'],
    minutes: 6,
    entry: 'path',
    steps: [
      {
        id: 'path',
        title: 'Check every directory in the path, not just the file',
        why: 'Reaching a file needs execute permission on every directory above it. A perfect 644 on the file is irrelevant if a parent directory is missing its x bit for you.',
        run: [
          'namei -l /full/path/to/file',
          'ls -la /full/path/to/',
          'id <user>   # the identity that actually matters, not yours',
          'sudo -u <user> test -r /full/path/to/file && echo readable || echo denied',
        ],
        look: 'namei prints every component with its mode and owner. Find the first line where the user lacks x on a directory, or r on the file.',
        branches: [
          { when: 'A directory in the path lacks x', then: 'found:traverse', outcome: 'Blocked by a parent directory.', fix: ['Grant traverse on the directory: `chmod o+x /parent` — x without r allows passing through without listing.', 'Prefer group ownership over world permissions where you can.'] },
          { when: 'Everything in the path looks right', then: 'layers' },
          { when: 'The user is not who you assumed', then: 'found:identity', outcome: 'The process runs as someone else.', fix: ['Check what it actually runs as: `ps -o user,group,pid,comm -p <PID>`, or `User=` in the systemd unit.', 'A container runs as its image user unless told otherwise — often root, sometimes an arbitrary UID with no matching passwd entry.', 'Supplementary groups only apply from the next login: `id` inside the running process is the truth.'] },
        ],
      },
      {
        id: 'layers',
        title: 'Check the layers above plain permissions',
        why: 'Unix modes are only the first gate. ACLs, SELinux, AppArmor, mount options and file attributes all deny independently, and none of them show up in ls.',
        run: [
          'getfacl /path/to/file',
          'ls -Z /path/to/file            # SELinux label',
          'ausearch -m avc -ts recent     # SELinux denials',
          'dmesg -T | grep -i -E "apparmor|denied"',
          'lsattr /path/to/file           # immutable bit',
          'mount | grep -E "noexec|nosuid|ro,"',
        ],
        look: 'A `+` at the end of the ls mode means an ACL exists. AVC denials name the exact context that was refused.',
        branches: [
          { when: 'An SELinux AVC denial appears', then: 'found:selinux', outcome: 'SELinux is refusing it.', fix: ['Read the denial properly: `ausearch -m avc -ts recent | audit2why`.', 'Usually a wrong label rather than a policy that needs changing: `restorecon -Rv /path` fixes most of it.', 'For a non-standard location, set the context: `semanage fcontext -a -t <type> "/path(/.*)?" && restorecon -Rv /path`.', 'Setting SELinux permissive is a diagnostic step, not a fix. Put it back.'] },
          { when: 'An ACL is denying it', then: 'found:acl', outcome: 'A POSIX ACL overrides what the mode suggests.', fix: ['Read it with getfacl. The mask entry caps every named user and group, and is the usual surprise.', 'Grant with `setfacl -m u:<user>:rx /path`, and remember the default ACL on a directory governs new files.'] },
          { when: 'Mounted noexec / nosuid / read-only', then: 'found:mount', outcome: 'The mount options forbid it regardless of file permissions.', fix: ['noexec on /tmp is common hardening and breaks anything trying to run from there.', 'A filesystem remounted read-only after an error is a storage problem — check dmesg before remounting it rw.'] },
          { when: 'The immutable attribute is set', then: 'found:immutable', outcome: 'The file is immutable.', fix: ['Even root cannot write to a file with the immutable bit. Clear it with `chattr -i /path`.', 'It is set deliberately, so find out by whom before removing it.'] },
          { when: 'None of these apply', then: 'found:capability', outcome: 'Likely a missing capability rather than a file permission.', fix: ['Binding below port 1024 needs CAP_NET_BIND_SERVICE: `setcap cap_net_bind_service=+ep /usr/bin/prog`, or a systemd `AmbientCapabilities=`.', 'Inspect what a binary has: `getcap /path/to/binary`.', 'In a container, the runtime drops most capabilities by default — grant narrowly rather than running privileged.'] },
        ],
      },
    ],
  },

  // --------------------------------------------------------- CrashLoopBackOff
  {
    slug: 'crashloopbackoff',
    title: 'CrashLoopBackOff',
    symptom: 'A pod starts, dies, and restarts forever',
    blurb:
      'Read the previous container’s logs and its exit code — those two facts resolve most crash loops before you touch anything else.',
    domain: 'Kubernetes',
    keywords: ['kubernetes', 'k8s', 'pod', 'restart', 'exit code', 'probe', 'crash'],
    minutes: 7,
    entry: 'prev',
    steps: [
      {
        id: 'prev',
        title: 'Read the logs of the container that died',
        why: 'The running container is a fresh one that has not failed yet. Its logs are nearly empty. The evidence is in the previous instance, and `--previous` is the flag that gets it.',
        run: [
          'kubectl logs <pod> --previous',
          'kubectl logs <pod> --previous -c <container>   # when there are several',
          'kubectl describe pod <pod> | tail -30',
        ],
        look: 'The last lines before it stopped, and in describe: `Last State`, `Reason` and `Exit Code`.',
        branches: [
          { when: 'The logs show an application error', then: 'found:apperror', outcome: 'The application is failing on startup.', fix: ['Read the error rather than restarting hopefully — a missing environment variable, an unreachable dependency and a bad config file all look identical from the outside.', 'Reproduce locally with the same image and the same env: `docker run --rm -it --env-file env.list <image>`.', 'If it needs a dependency that is not ready yet, an init container or a readiness gate is the correct fix rather than a restart loop.'] },
          { when: 'Exit code 0', then: 'found:exit0', outcome: 'The process completed and exited.', fix: ['Kubernetes restarts a Deployment pod even on a clean exit — a completed process is not what a Deployment is for.', 'For work that finishes, use a Job or CronJob with the right restartPolicy.', 'For a server, the entrypoint is probably backgrounding itself or the command is wrong. PID 1 must stay in the foreground.'] },
          { when: 'Exit code 1 or 2', then: 'found:apperror', outcome: 'The application exited with an error.', fix: ['Generic failure — the logs are the only source of truth here.', 'Exit 2 from a shell entrypoint often means a misused builtin or a missing file.'] },
          { when: 'Exit code 137', then: 'handover:oom', handoff: 'oomkilled' },
          { when: 'Exit code 143', then: 'found:sigterm', outcome: 'Terminated by SIGTERM.', fix: ['Something asked it to stop — usually a failing liveness probe, an eviction, or a rollout.', 'Check the events: `kubectl describe pod <pod>` and look at what preceded the kill.'] },
          { when: 'Exit code 126 or 127', then: 'found:entrypoint', outcome: 'The entrypoint cannot be executed.', fix: ['127 is command not found; 126 is found but not executable.', 'Usually a wrong path, a missing shell in a distroless or scratch image, or a script without the executable bit.', 'CRLF line endings on an entrypoint script produce exactly this and are invisible in a diff.'] },
          { when: 'No logs at all', then: 'probes' },
        ],
      },
      {
        id: 'probes',
        title: 'Check whether a probe is killing it',
        why: 'A liveness probe that is stricter than the application’s startup time creates an unbreakable loop: the container is killed before it ever becomes ready, forever.',
        run: [
          'kubectl describe pod <pod> | grep -A5 -E "Liveness|Readiness|Startup"',
          'kubectl get events --field-selector involvedObject.name=<pod> --sort-by=.lastTimestamp',
          'kubectl exec <pod> -- curl -sv localhost:<port>/healthz   # if it stays up long enough',
        ],
        look: 'Events saying "Liveness probe failed", and the initialDelaySeconds against how long the application really takes to start.',
        branches: [
          { when: 'Liveness probe is failing', then: 'found:liveness', outcome: 'The liveness probe is killing a healthy-but-slow container.', fix: ['Use a startupProbe for slow starters — it suspends liveness until the application is genuinely up, which is exactly what it exists for.', 'Raise initialDelaySeconds and failureThreshold to match reality rather than optimism.', 'Point liveness at something cheap. A health endpoint that checks the database will take the pod down during a database blip.'] },
          { when: 'No probe events', then: 'found:noevidence', outcome: 'Not enough evidence yet.', fix: ['Get the full picture: `kubectl get pod <pod> -o yaml` and read status.containerStatuses.', 'Check the node: `kubectl describe node <node>` for pressure conditions and evictions.', 'A container with no logs and no probe failures may be dying before it can write anything — check the image entrypoint and the runtime logs on the node.'] },
        ],
      },
    ],
  },

  // -------------------------------------------------------- ImagePullBackOff
  {
    slug: 'imagepullbackoff',
    title: 'ImagePullBackOff',
    symptom: 'The pod will not start because the image will not pull',
    blurb:
      'The event message names the cause almost every time — it is a question of knowing which of four failures it describes.',
    domain: 'Kubernetes',
    keywords: ['kubernetes', 'image', 'registry', 'pull', 'authentication', 'ErrImagePull'],
    minutes: 4,
    entry: 'event',
    steps: [
      {
        id: 'event',
        title: 'Read the pull error verbatim',
        why: 'Registry errors are specific and the wording matters. "Not found", "unauthorized", "no such host" and "timeout" have four different fixes and one shared symptom.',
        run: [
          'kubectl describe pod <pod> | grep -A10 Events',
          'kubectl get events --sort-by=.lastTimestamp | tail -20',
        ],
        look: 'The Failed event message, and the exact image reference in it — including the tag, which is often the whole story.',
        branches: [
          { when: 'manifest unknown / not found', then: 'found:notag', outcome: 'The image or tag does not exist.', fix: ['Check the reference character by character — a typo in the tag is the single most common cause.', 'Verify it exists: `crane manifest <image>` or `docker manifest inspect <image>`.', 'A CI pipeline that failed to push leaves exactly this. Check the build actually finished.', 'Watch for architecture: an amd64-only image on an arm64 node reports as not found.'] },
          { when: 'unauthorized / authentication required', then: 'found:auth', outcome: 'The registry rejected the credentials.', fix: ['The pod needs an imagePullSecret, and it must be in the same namespace as the pod.', 'Check it is attached: `kubectl get pod <pod> -o jsonpath="{.spec.imagePullSecrets}"`.', 'Verify the secret decodes to what you expect: `kubectl get secret <name> -o jsonpath="{.data.\\.dockerconfigjson}" | base64 -d`.', 'On EKS, GKE or AKS the node role may be the intended path instead — check the node can pull without a secret at all.'] },
          { when: 'no such host / i/o timeout', then: 'found:network', outcome: 'The node cannot reach the registry.', fix: ['This is a node networking problem, not a Kubernetes one. Test from the node itself.', 'Check the node’s DNS and its egress route — a private cluster usually needs a NAT gateway or a VPC endpoint to reach a public registry.', 'A proxy configured for the container runtime is a separate setting from the pod’s environment.'] },
          { when: 'toomanyrequests / rate limit', then: 'found:ratelimit', outcome: 'The registry is rate limiting you.', fix: ['Docker Hub limits anonymous pulls by source IP, which a whole NAT-ed cluster shares.', 'Authenticate even for public images — the limit for a logged-in account is far higher.', 'A pull-through cache or a registry mirror removes the problem permanently.'] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------- OOMKilled
  {
    slug: 'oomkilled',
    title: 'OOMKilled',
    symptom: 'A container is killed with exit code 137',
    blurb:
      'Find out whether the limit was too low or the application is leaking, and why a JVM or Node process ignores the limit you set.',
    domain: 'Kubernetes',
    keywords: ['oom', '137', 'memory limit', 'kubernetes', 'jvm', 'heap', 'cgroup'],
    minutes: 6,
    entry: 'confirm',
    steps: [
      {
        id: 'confirm',
        title: 'Confirm the kill and read the limit',
        why: 'Exit code 137 is 128 plus signal 9. It means SIGKILL, which is usually the cgroup OOM killer but not always — a node under pressure evicts differently, and the distinction changes the fix.',
        run: [
          'kubectl describe pod <pod> | grep -A5 "Last State"',
          'kubectl get pod <pod> -o jsonpath="{.spec.containers[*].resources}" | jq',
          'kubectl top pod <pod> --containers',
        ],
        look: '`Reason: OOMKilled` against a plain SIGKILL, and the memory limit against what the container was actually using.',
        branches: [
          { when: 'Reason is OOMKilled and usage was at the limit', then: 'shape' },
          { when: 'Reason is OOMKilled but usage looked low', then: 'found:spike', outcome: 'A short spike the sampler never saw.', fix: ['`kubectl top` samples on an interval and misses spikes entirely. A burst on startup or during a large request is invisible to it.', 'Use the container_memory_working_set_bytes metric at a fine resolution instead.', 'Startup spikes are common — JIT warmup, cache preloading, a large migration. A higher limit with the same request may be all it needs.'] },
          { when: 'Killed but not OOMKilled', then: 'found:evicted', outcome: 'Node pressure rather than a container limit.', fix: ['Check the node: `kubectl describe node <node>` for MemoryPressure, and look for Evicted pods.', 'Pods without a memory request are first to be evicted — Burstable and BestEffort go before Guaranteed.', 'Set requests as well as limits so the scheduler places the pod somewhere it fits.'] },
        ],
      },
      {
        id: 'shape',
        title: 'Decide whether it is a leak or a bad limit',
        why: 'A limit that is simply too low and a genuine leak both end in OOMKilled. The shape of memory over time tells them apart, and only one of them is fixed by raising the number.',
        run: [
          'kubectl get pod <pod> -o jsonpath="{.status.containerStatuses[*].restartCount}"',
          'kubectl exec <pod> -- cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.current 2>/dev/null',
          'kubectl exec <pod> -- cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null   # cgroup v1',
        ],
        look: 'Whether restarts happen at a steady interval — a sawtooth is a leak. Random intervals under load point at a limit that is too tight.',
        branches: [
          { when: 'Regular sawtooth — grows then dies', then: 'found:leak', outcome: 'A leak. Raising the limit only lengthens the interval.', fix: ['Profile inside the container rather than guessing at the number.', 'Raising the limit buys time to fix it and nothing else — say so when you do it, so nobody records it as resolved.', 'The Linux memory playbook covers finding the leak itself.'] },
          { when: 'Dies under load, stable otherwise', then: 'found:toolow', outcome: 'The limit is below the real working set.', fix: ['Measure the peak properly, then set the limit above it with headroom.', 'Set requests equal to limits for anything latency-sensitive — that gets Guaranteed QoS and takes it out of the eviction queue.'] },
          { when: 'It is a JVM, Node or Python runtime', then: 'found:runtime', outcome: 'The runtime cannot see the cgroup limit.', fix: ['A JVM before 8u191 ignores container limits entirely and sizes its heap from the host. Use -XX:+UseContainerSupport and -XX:MaxRAMPercentage=75.', 'Node needs --max-old-space-size set below the container limit; it defaults to host memory.', 'Heap is not the whole process — metaspace, thread stacks and native buffers live outside it. Leave 20–25% of the limit unallocated to the heap.'] },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- 502/503
  {
    slug: 'bad-gateway',
    title: '502 and 503 from the proxy',
    symptom: 'The load balancer returns 502 Bad Gateway or 503 Service Unavailable',
    blurb:
      'The two codes mean different things: 502 is a broken conversation with a backend, 503 is having no backend to talk to.',
    domain: 'Networking',
    keywords: ['502', '503', '504', 'nginx', 'ingress', 'upstream', 'gateway', 'endpoints'],
    minutes: 6,
    entry: 'which',
    steps: [
      {
        id: 'which',
        title: 'Separate the two codes',
        why: 'They are produced at different points. 503 usually means the proxy has no healthy backend at all. 502 means it reached one and the conversation broke. Treating them as the same failure wastes the first ten minutes.',
        run: [
          'curl -sv https://<host>/path 2>&1 | tail -20',
          'kubectl get endpoints <service>',
          'kubectl get pods -l <selector> -o wide',
        ],
        look: 'The status code, which server header produced it, and whether the Service has any endpoints at all.',
        branches: [
          { when: '503 and the endpoint list is empty', then: 'found:noendpoints', outcome: 'No backends are registered.', fix: ['An empty endpoints list means no pod is both matching and Ready. The selector and the pod labels must agree exactly.', 'Compare them: `kubectl get svc <svc> -o jsonpath="{.spec.selector}"` against the pod labels.', 'If pods exist but are not Ready, it is a readiness probe problem — fix that and the endpoints appear.'] },
          { when: '503 with endpoints present', then: 'found:overload', outcome: 'The proxy is shedding load.', fix: ['nginx returns 503 when every upstream is marked down by passive health checks — check the error log for "no live upstreams".', 'max_fails and fail_timeout can take a whole pool out after a brief blip.', 'A rate limit or connection limit on the proxy produces 503 too.'] },
          { when: '502', then: 'backend' },
          { when: '504', then: 'found:timeout', outcome: 'The backend was too slow to answer.', fix: ['The backend exceeded the proxy’s read timeout — proxy_read_timeout in nginx, the annotation on an ingress.', 'Raising the timeout hides the symptom. Find out why it is slow with the CPU or stuck-process trees.', 'Check for a timeout mismatch: a backend that takes 60s behind a proxy that waits 30s fails every time.'] },
        ],
      },
      {
        id: 'backend',
        title: 'Find where the conversation broke',
        why: 'A 502 means the proxy got something it could not use: a connection reset, a malformed response, or a closed keepalive. The proxy’s own error log names which.',
        run: [
          'kubectl logs -n ingress-nginx <controller-pod> --tail=50',
          'kubectl logs <backend-pod> --tail=50',
          'kubectl exec -it <debug-pod> -- curl -sv http://<pod-ip>:<port>/   # bypass the proxy',
        ],
        look: 'In the proxy log: "upstream prematurely closed connection", "connect() failed", or "recv() failed". Each names a different failure.',
        branches: [
          { when: 'upstream prematurely closed connection', then: 'found:keepalive', outcome: 'The backend closed a connection the proxy was still using.', fix: ['Classic keepalive mismatch: the backend’s idle timeout is shorter than the proxy’s, so the proxy reuses a connection the backend just closed.', 'Make the backend’s keepalive timeout longer than the proxy’s. For nginx in front of Node or Go, this is the usual 502.', 'It can also be the backend crashing mid-request — check for a restart at the same timestamp.'] },
          { when: 'connect() failed / connection refused', then: 'handover:port', handoff: 'port-unreachable' },
          { when: 'Direct curl to the pod works', then: 'found:proxyconfig', outcome: 'The backend is fine; the proxy is pointed wrong.', fix: ['Check the Service port against the container port — targetPort mismatches are easy to introduce and silent.', 'For an HTTPS backend, the proxy needs the right protocol annotation, or it will speak plaintext to a TLS port and get nonsense back.', 'A path rewrite that mangles the request produces a 502 from a backend that rejects it.'] },
        ],
      },
    ],
  },
];

// ------------------------------------------------------------ command atlas

export interface AtlasEntry {
  name: string;
  domain: Domain;
  /** One line: what it is genuinely for. */
  purpose: string;
  /** The invocations worth remembering. */
  uses: { cmd: string; note: string }[];
  /** The thing people get wrong. */
  gotcha?: string;
}

export const atlas: AtlasEntry[] = [
  {
    name: 'ss',
    domain: 'Networking',
    purpose: 'Socket statistics. The replacement for netstat, and considerably faster on a busy host.',
    uses: [
      { cmd: 'ss -tlnp', note: 'Every TCP socket listening, with the owning process' },
      { cmd: 'ss -tnp state established', note: 'Established connections and who owns them' },
      { cmd: 'ss -tn state time-wait | wc -l', note: 'Count TIME_WAIT sockets before blaming them' },
      { cmd: 'ss -tnpi dst 10.0.0.5', note: 'Connections to one peer, with RTT and congestion window' },
      { cmd: 'ss -s', note: 'Summary totals by socket state' },
    ],
    gotcha:
      'Recv-Q on a listening socket is the accept backlog, not buffered data. Non-zero there means the application is not calling accept() fast enough.',
  },
  {
    name: 'lsof',
    domain: 'Linux',
    purpose: 'What files, sockets and devices a process has open — and who has a given file open.',
    uses: [
      { cmd: 'lsof -nP -iTCP:8080 -sTCP:LISTEN', note: 'Who is listening on a port' },
      { cmd: 'lsof +L1', note: 'Deleted files still held open, which is where missing disk space hides' },
      { cmd: 'lsof -p <PID>', note: 'Everything one process has open' },
      { cmd: 'lsof /var/log/app.log', note: 'Which processes hold this file' },
      { cmd: 'lsof -u www-data', note: 'Everything one user has open' },
    ],
    gotcha:
      '-n skips DNS and -P skips port name lookup. Without them lsof can take a very long time on a host with unreachable DNS.',
  },
  {
    name: 'strace',
    domain: 'Process',
    purpose: 'Every syscall a process makes. The definitive answer to "what is it actually doing".',
    uses: [
      { cmd: 'strace -p <PID> -f -tt', note: 'Attach to a running process and all its threads, with timestamps' },
      { cmd: 'strace -c -f -p <PID>', note: 'Histogram instead of a firehose — the first thing to run' },
      { cmd: 'strace -e trace=openat,stat -f <cmd>', note: 'What files it looks for, including the ones it fails to find' },
      { cmd: 'strace -e trace=network -f -p <PID>', note: 'Network syscalls only' },
      { cmd: 'strace -f -o out.txt <cmd>', note: 'Capture to a file for something that fails at startup' },
    ],
    gotcha:
      'strace stops the process at every syscall. On a busy service the slowdown is order-of-magnitude, so attach briefly and never silently.',
  },
  {
    name: 'tcpdump',
    domain: 'Networking',
    purpose: 'Capture packets. The final arbiter when two sides disagree about what was sent.',
    uses: [
      { cmd: 'tcpdump -i any -nn port 443 -c 100', note: 'First hundred packets on a port, no name resolution' },
      { cmd: 'tcpdump -i eth0 -s 0 -w cap.pcap host 10.0.0.5', note: 'Full packets to a file for later analysis' },
      { cmd: "tcpdump -i any -nn 'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'", note: 'Connection attempts and refusals only' },
      { cmd: 'tcpdump -i any -nn -A port 80', note: 'Print payload as ASCII for plaintext protocols' },
    ],
    gotcha:
      'Capturing on the box you are SSHed into records your own session, which then generates more traffic. Exclude it: `not port 22`.',
  },
  {
    name: 'dig',
    domain: 'Networking',
    purpose: 'Query DNS directly, without the resolver library getting in the way.',
    uses: [
      { cmd: 'dig +short example.com', note: 'Just the answer' },
      { cmd: 'dig example.com @8.8.8.8', note: 'Ask a specific resolver, to compare against your own' },
      { cmd: 'dig +trace example.com', note: 'Walk the delegation from the root — finds which step breaks' },
      { cmd: 'dig -x 10.0.0.5', note: 'Reverse lookup' },
      { cmd: 'dig example.com AAAA', note: 'A and AAAA are separate records and fail separately' },
    ],
    gotcha:
      'dig bypasses NSS, so it can succeed while the application fails. `getent hosts` follows the same path the application does.',
  },
  {
    name: 'openssl s_client',
    domain: 'TLS',
    purpose: 'Speak TLS to a server by hand and see exactly what it presents.',
    uses: [
      { cmd: 'openssl s_client -connect host:443 -servername host </dev/null', note: 'The handshake, chain and verify result' },
      { cmd: 'openssl s_client -connect host:443 -showcerts </dev/null', note: 'Every certificate sent — check the chain is complete' },
      { cmd: 'openssl s_client -connect host:443 -cert c.crt -key c.key', note: 'Present a client certificate for mutual TLS' },
      { cmd: 'openssl s_client -connect host:443 -tls1_2 </dev/null', note: 'Force a protocol version to test support' },
    ],
    gotcha:
      'Without -servername no SNI is sent, so a shared host answers with its default certificate and you debug the wrong one.',
  },
  {
    name: 'ps',
    domain: 'Process',
    purpose: 'A snapshot of processes, with whichever columns you actually need.',
    uses: [
      { cmd: 'ps -eo pid,ppid,stat,pcpu,pmem,etime,comm --sort=-pcpu | head', note: 'Top CPU consumers with parentage and age' },
      { cmd: 'ps -L -o pid,tid,pcpu,comm -p <PID>', note: 'Per thread, which is where the CPU actually is' },
      { cmd: 'ps -eo pid,stat,wchan:30,comm | grep " D"', note: 'Processes stuck in uninterruptible sleep' },
      { cmd: 'ps --ppid <PID>', note: 'Children of a process' },
    ],
    gotcha:
      'STAT is the fastest diagnosis available. D cannot be killed, Z is already dead, T has been stopped by a signal.',
  },
  {
    name: 'stat',
    domain: 'Linux',
    purpose: 'Everything the filesystem records about a file, including the three timestamps.',
    uses: [
      { cmd: 'stat file', note: 'Size, inode, permissions, and atime/mtime/ctime' },
      { cmd: 'stat -c "%n %s %U:%G %a %y" file', note: 'A format you can put in a script' },
      { cmd: 'stat -f /path', note: 'The filesystem rather than the file' },
    ],
    gotcha:
      'ctime is inode change time, not creation time. It moves when permissions or ownership change, and Linux mostly does not record a creation time at all.',
  },
  {
    name: 'journalctl',
    domain: 'Linux',
    purpose: 'Query the systemd journal, which is where the evidence usually is.',
    uses: [
      { cmd: 'journalctl -u nginx -S -1h --no-pager', note: 'One unit, last hour' },
      { cmd: 'journalctl -p err -S today', note: 'Errors and worse since midnight' },
      { cmd: 'journalctl -k -S -10min', note: 'Kernel messages — OOM kills and hardware errors land here' },
      { cmd: 'journalctl -u app -f', note: 'Follow, like tail -f' },
      { cmd: 'journalctl --disk-usage', note: 'How much space the journal is holding' },
    ],
    gotcha:
      'A journal without persistent storage is lost on reboot. If you need history after a crash, `Storage=persistent` must be set before the crash.',
  },
  {
    name: 'find',
    domain: 'Linux',
    purpose: 'Walk a tree with predicates. The most useful and most misused tool on the box.',
    uses: [
      { cmd: 'find /var -xdev -type f -size +1G', note: 'Large files, staying on one filesystem' },
      { cmd: 'find /etc -mmin -60 -type f', note: 'Changed in the last hour — what did that deploy touch' },
      { cmd: 'find / -xdev -type f -perm -4000 2>/dev/null', note: 'setuid binaries, for an audit' },
      { cmd: 'find . -name "*.log" -mtime +30 -delete', note: 'Delete carefully, and run it without -delete first' },
      { cmd: 'find . -newer reference-file', note: 'Everything modified after a known point in time' },
    ],
    gotcha:
      '-xdev keeps find on one filesystem. Without it you walk /proc, /sys and every network mount, which is slow and produces nonsense.',
  },
  {
    name: 'curl',
    domain: 'Networking',
    purpose: 'Make an HTTP request and see precisely what happened.',
    uses: [
      { cmd: 'curl -sv https://host/path', note: 'Headers, TLS handshake and response' },
      { cmd: "curl -s -o /dev/null -w '%{http_code} %{time_total}s\\n' url", note: 'Status and timing only, for scripting' },
      { cmd: "curl -w '@curl-format.txt' -o /dev/null -s url", note: 'DNS, connect, TLS and first-byte timings separately' },
      { cmd: 'curl --resolve host:443:10.0.0.5 https://host/', note: 'Test one backend directly while keeping the right SNI and Host' },
      { cmd: 'curl --cacert ca.pem --cert c.crt --key c.key https://host/', note: 'Mutual TLS from the command line' },
    ],
    gotcha:
      '--resolve is the right way to test a single backend behind a load balancer. Editing /etc/hosts changes it for everything on the machine.',
  },
  {
    name: 'nc',
    domain: 'Networking',
    purpose: 'Open a raw TCP connection. The simplest possible reachability test.',
    uses: [
      { cmd: 'nc -vz host 443', note: 'Is the port open — refused and timeout mean different things' },
      { cmd: 'nc -vz -w 3 host 443', note: 'With a timeout, so a drop fails fast' },
      { cmd: 'nc -l 9000', note: 'Listen, to test connectivity from the other direction' },
      { cmd: 'nc -u -vz host 53', note: 'UDP, where success is much less meaningful' },
    ],
    gotcha:
      'Reaching a port proves TCP works, nothing more. A healthy TCP connection to a broken application still fails every request.',
  },
  {
    name: 'vmstat',
    domain: 'Linux',
    purpose: 'System-wide activity over time. The fastest way to characterise what kind of busy a box is.',
    uses: [
      { cmd: 'vmstat 1 10', note: 'Ten one-second samples — never trust the first line' },
      { cmd: 'vmstat -s', note: 'Totals since boot' },
      { cmd: 'vmstat -d', note: 'Per-disk statistics' },
    ],
    gotcha:
      'The first line is an average since boot and is almost always misleading. Read from the second line onwards.',
  },
  {
    name: 'kubectl',
    domain: 'Kubernetes',
    purpose: 'The cluster API, from the command line. These are the invocations that matter during an incident.',
    uses: [
      { cmd: 'kubectl logs <pod> --previous', note: 'The logs of the container that died, not the fresh one' },
      { cmd: 'kubectl get events --sort-by=.lastTimestamp | tail -30', note: 'Events in the order they happened, which is not the default' },
      { cmd: 'kubectl get endpoints <svc>', note: 'Whether a Service has any backends at all' },
      { cmd: 'kubectl describe pod <pod>', note: 'Probes, limits, last state and exit code in one place' },
      { cmd: 'kubectl debug -it <pod> --image=nicolaka/netshoot', note: 'A shell with network tools beside a distroless container' },
    ],
    gotcha:
      'Events are namespaced and expire, by default after an hour. If an incident is older than that, the events are already gone.',
  },
];

export const domains: Domain[] = ['Linux', 'Networking', 'TLS', 'Kubernetes', 'Storage', 'Process'];

export const playbookBySlug = (slug: string) => playbooks.find((p) => p.slug === slug);
