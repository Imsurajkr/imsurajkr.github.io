export interface Tool {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Short SEO description for the tool's own page. */
  seo: string;
  category: 'Networking' | 'Encoding' | 'Security' | 'Config' | 'Generators';
  icon: string;
  keywords: string[];
  /**
   * The write-up that explains the thing this tool does. Linking the two in
   * both directions gives a reader the background and gives a crawler a reason
   * to treat the pair as one topic rather than two unrelated pages.
   */
  guide?: { slug: string; title: string; blurb: string };
}

/**
 * Single source of truth for the /tools section. Adding a tool means adding an
 * entry here plus a page at src/pages/tools/<slug>.astro — the index, nav and
 * sitemap all derive from this list.
 */
export const tools: Tool[] = [
  {
    slug: 'subnet-calculator',
    name: 'Visual Subnet Calculator',
    tagline: 'Split and join CIDR blocks visually',
    description:
      'Divide a network into subnets by clicking, then join them back. Shows address ranges, usable IPs, netmasks and host counts — and encodes your whole division into a shareable link. Look up a single address to see every network it belongs to and which reserved block it falls in.',
    seo: 'Free visual subnet calculator — divide and join IPv4 CIDR blocks interactively, with netmasks, address ranges, usable IPs and host counts. Look up any IP to see which subnets and reserved blocks contain it. Runs entirely in your browser.',
    category: 'Networking',
    icon: 'network',
    keywords: [
      'subnet calculator',
      'CIDR calculator',
      'VLSM',
      'IPv4 subnetting',
      'netmask',
      'network planning',
      'what subnet is this IP in',
      'IP address lookup private or public',
    ],
    guide: {
      slug: 'reading-an-ipv4-address',
      title: 'Reading an IPv4 Address',
      blurb:
        'Why one address belongs to 33 networks at once, which blocks are reserved, and how to split a range without leaving gaps.',
    },
  },
  {
    slug: 'traceroute-analyzer',
    name: 'Traceroute Analyzer',
    tagline: 'See how far your traffic actually gets',
    description:
      'Paste traceroute, tracert or mtr output and get a straight answer: the last hop that replied, whether the destination was ever reached, and whether the silence after it is a firewall, a filtered router or real packet loss.',
    seo: 'Free traceroute analyzer — paste traceroute, Windows tracert or mtr output and see the last responding hop, where traffic stops, latency jumps and packet loss. Runs entirely in your browser.',
    category: 'Networking',
    icon: 'route',
    keywords: [
      'traceroute analyzer',
      'tracert output',
      'mtr report',
      'where does traffic stop',
      'network path troubleshooting',
      'packet loss hop',
    ],
    guide: {
      slug: 'reading-a-traceroute',
      title: 'What a Traceroute Actually Tells You',
      blurb:
        'How TTL expiry produces the output, why stars in the middle mean nothing, and why a slow hop is usually not the slow hop.',
    },
  },
  {
    slug: 'pcap-analyzer',
    name: 'PCAP Conversation Analyzer',
    tagline: 'See which hosts are talking, and about what',
    description:
      'Drop in a capture from tcpdump, tshark or Wireshark and get the picture those tools bury in a packet list: a map of who talked to whom, how much moved in each direction, which services were involved and which connections never completed. The file is read in this tab — it is never uploaded.',
    seo: 'Free online PCAP analyzer — open a .pcap or .pcapng capture and see host conversations, top talkers, protocols, services and failed TCP handshakes on one page. Reads the file in your browser, nothing is uploaded.',
    category: 'Networking',
    icon: 'graph',
    keywords: [
      'pcap analyzer',
      'pcapng viewer online',
      'wireshark alternative browser',
      'tshark conversations',
      'network traffic analysis',
      'top talkers pcap',
    ],
    guide: {
      slug: 'reading-a-packet-capture',
      title: 'Finding Out What Your Machine Is Talking To',
      blurb:
        'Capturing with tcpdump without capturing yourself, and reading conversations rather than packets.',
    },
  },
  {
    slug: 'base64',
    name: 'Base64 Encoder / Decoder',
    tagline: 'Encode and decode, UTF-8 safe',
    description:
      'Convert text to and from Base64, including URL-safe output. Handles full UTF-8 correctly, so emoji and non-Latin scripts survive the round trip.',
    seo: 'Free Base64 encoder and decoder with UTF-8 and URL-safe support. Decode Kubernetes secrets and encode payloads locally — nothing is uploaded.',
    category: 'Encoding',
    icon: 'code',
    keywords: ['base64 encode', 'base64 decode', 'URL-safe base64', 'kubernetes secret decode'],
    guide: {
      slug: 'decoding-tokens-safely',
      title: 'Base64 Is Not Encryption',
      blurb:
        'A Kubernetes secret is plain text with extra steps. What the encoding does and does not protect.',
    },
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    tagline: 'Inspect header, payload and expiry',
    description:
      'Decode a JSON Web Token and read its header and claims, with human-readable timestamps and a live expiry check. Decoding only — the signature is never verified and the token never leaves the page.',
    seo: 'Free JWT decoder — inspect JSON Web Token headers, payloads, claims and expiry times in your browser. No token is transmitted or stored.',
    category: 'Security',
    icon: 'key',
    keywords: ['jwt decoder', 'json web token', 'decode jwt', 'jwt claims', 'oidc token'],
    guide: {
      slug: 'decoding-tokens-safely',
      title: 'Decoding a JWT Is Not Verifying It',
      blurb:
        'What the signature proves, what it does not, and the alg:none trap that has burned real systems.',
    },
  },
  {
    slug: 'yaml-json',
    name: 'YAML ↔ JSON Converter',
    tagline: 'Convert manifests both ways',
    description:
      'Translate between YAML and JSON in either direction, with clear parse errors. Built for Kubernetes manifests, CI configs and Terraform variable files.',
    seo: 'Free YAML to JSON and JSON to YAML converter for Kubernetes manifests and CI configs. Converts locally in your browser with clear error messages.',
    category: 'Config',
    icon: 'braces',
    keywords: ['yaml to json', 'json to yaml', 'kubernetes manifest', 'yaml converter'],
    guide: {
      slug: 'decoding-tokens-safely',
      title: 'Base64 Is Not Encryption',
      blurb:
        'Where the secrets in your manifests actually live, and why a converter should never phone home.',
    },
  },
  {
    slug: 'cron-expression',
    name: 'Cron Expression Explainer',
    tagline: 'Read a schedule in plain English',
    description:
      'Translate a 5-field cron expression into a sentence and preview the next run times. Understands ranges, steps and lists, plus the usual @daily style shorthands.',
    seo: 'Free cron expression parser — explain crontab schedules in plain English and preview upcoming run times. Supports Kubernetes CronJob syntax.',
    category: 'Config',
    icon: 'clock',
    keywords: ['cron expression', 'crontab parser', 'cron schedule', 'kubernetes cronjob'],
  },
  {
    slug: 'generators',
    name: 'UUID & Password Generator',
    tagline: 'Cryptographically secure values',
    description:
      'Generate RFC 4122 v4 UUIDs and strong random passwords or API keys using the browser’s Web Crypto API — real entropy, not Math.random().',
    seo: 'Free UUID v4 and secure password generator using the Web Crypto API. Generates cryptographically strong values locally in your browser.',
    category: 'Generators',
    icon: 'dice',
    keywords: ['uuid generator', 'uuid v4', 'password generator', 'api key generator', 'secure random'],
  },
];

export const toolBySlug = (slug: string) => tools.find((t) => t.slug === slug);
