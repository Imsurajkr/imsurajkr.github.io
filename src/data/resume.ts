export type Tone = 'neutral' | 'signal' | 'health' | 'guard';

export interface Role {
  title: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  current?: boolean;
  highlights: string[];
}

export interface Engagement {
  client: string;
  duration: string;
  summary: string;
}

/**
 * A project is a story, not a template. One or two paragraphs in plain voice,
 * the concrete things that changed, and — where there is one — the mistake.
 * Deliberately no "problem / decisions / architecture / outcome" scaffolding:
 * that structure is what made the old version read like it was generated.
 */
export interface Project {
  slug: string;
  name: string;
  context: string;
  /** The story, in his own words. One paragraph per entry. */
  story: string[];
  /** What actually changed. Numbers where the numbers exist. */
  changed: string[];
  /** The part most portfolios leave out. */
  gotWrong?: string;
  /** One prose line, not a chip grid. */
  stack: string;
}

export const profile = {
  headline: 'Platform Engineer',
  tagline: 'Kubernetes, Terraform, and the 3 AM problems.',
  summary:
    'Currently keeping banking workloads online at Kotak Mahindra Bank. Still learning.',
  /**
   * Real numbers only. The values are parsed by ImpactReadout for the count-up
   * animation, so each one needs to start with digits.
   */
  stats: [
    { value: '7', label: 'Years doing this' },
    { value: '3', label: 'Clouds run in production' },
    { value: '20 min', label: 'CVE triage, down from 3 days' },
    { value: '2', label: 'Platform tickets a week, down from 15' },
  ],
};

export const experience: Role[] = [
  {
    title: 'DevOps Engineer 2',
    company: 'Kotak Mahindra Bank',
    location: 'Gurugram, India',
    start: 'Oct 2024',
    end: 'Present',
    current: true,
    highlights: [
      'Run Kong API Gateway and Istio service mesh for banking workloads.',
      'Blue-green deployments on customer-facing systems. A bad release is a switch flip, not a 2 AM rollback.',
      'Built the CVE platform described above.',
      'Automated database backups into S3 with lifecycle policies. First time our DR drill did not make the auditor wince.',
    ],
  },
  {
    title: 'Lead DevOps Engineer',
    company: 'FiftyFive Technologies',
    location: 'India',
    start: 'Jul 2020',
    end: 'Oct 2024',
    highlights: [
      'Managed production across Azure, AWS and GCP simultaneously. Would not recommend, but we made it work.',
      'Built the Kubernetes self-service API. Still my favourite project.',
      'Deployed Kubeflow for ML workflows. ML engineers are a different species — respect.',
      'Led a team of 4, ran multiple client projects, somehow did not drop anything.',
    ],
  },
  {
    title: 'DevOps Developer',
    company: 'RoboMQ',
    location: 'India',
    start: 'Jan 2020',
    end: 'May 2020',
    highlights: [
      'First job. First Dockerfiles. First time I deleted a namespace in prod (it was a test cluster, but still).',
      'Built DevLogger — a company-wide log system with RabbitMQ. My first production system. It had bugs. It worked anyway.',
    ],
  },
];

export const engagements: Engagement[] = [
  {
    client: 'Apica',
    duration: '1,075 days',
    summary: 'Puppet, Nomad, cost optimisation, and the health monitor described above.',
  },
  {
    client: 'NIBE',
    duration: '1,835 days',
    summary: 'Azure IoT platform, device provisioning, AKS.',
  },
];

export const projects: Project[] = [
  {
    slug: 'cve-visibility',
    name: 'CVE Visibility Platform',
    context: 'Kotak Mahindra Bank',
    story: [
      'The security team got vulnerability reports as PDFs every quarter. By the time anyone read them, the data was already stale. Nobody could answer a simple question: is CVE-2024-XXXXX running in production right now?',
      'I built a Python service that pulls container scan results and joins them against what is actually scheduled in the cluster — not what is in the registry, what is running. A critical CVE in an internal batch job gets deprioritised. A medium CVE in an internet-facing pod gets flagged immediately.',
    ],
    changed: [
      'Security team went from 3-day manual triage to about 20 minutes.',
      'Auditors get the same dashboard engineers use — no more separate compliance reports nobody trusts.',
      'First time the platform team got a thank-you email from security.',
    ],
    stack: 'Python, Kubernetes API, container scanning, a lot of Slack threads',
  },
  {
    slug: 'k8s-self-service',
    name: 'Kubernetes Self-Service API',
    context: 'FiftyFive Technologies',
    story: [
      'We were a 4-person platform team supporting multiple client engagements. Every day: "Can you create a namespace?" "Can you scale this up?" "I need to see the logs for pod-whatever."',
      'I built a FastAPI service that let product teams do this themselves. One API across EKS, AKS and GKE. Quotas and guardrails baked in — if you try to request 100 CPU cores, it says no before anything gets created.',
    ],
    changed: [
      'Platform tickets dropped from about 15 a week to 2–3.',
      'Developers stopped waiting 4 hours for a namespace.',
      'I stopped being a human kubectl proxy.',
    ],
    gotWrong:
      'First version had no rate limiting. Someone wrote a script that hammered the API and nearly took down the control plane. Added throttling. Lesson learned.',
    stack: 'Python, FastAPI, Kubernetes API, OIDC, Terraform',
  },
  {
    slug: 'health-monitoring',
    name: 'Health Monitoring System',
    context: 'Apica · 1,075 days',
    story: [
      'Nomad and Puppet failures were invisible until something downstream broke. By then you were already in incident mode.',
      'I wrote a Python monitor that polls the scheduler and config management layer directly — the services everything else depends on. Not the apps. The plumbing. Output goes straight into the alerting pipeline we already respond to. No new dashboard nobody watches.',
    ],
    changed: [
      'Silent infrastructure failures became alerts people already had a habit of answering.',
      'The same visibility exposed idle and oversized resources, which fed a cost optimisation effort.',
      'I would tell you the exact saving but I signed an NDA. It was enough that finance noticed.',
    ],
    stack: 'Python, Nomad, Puppet, the alerting system we already had',
  },
];

/**
 * Grouped by how often he actually reaches for the thing, which is the only
 * grouping a reader can do anything with. The old version was 30+ items
 * arranged by category, which told you nothing about depth.
 */
export const skills = [
  {
    id: 'daily',
    label: 'Every day',
    items: ['Kubernetes', 'Terraform', 'Python', 'AWS', 'Bash'],
  },
  {
    id: 'regular',
    label: 'Regularly',
    items: ['Istio', 'Kong', 'FastAPI', 'Azure DevOps', 'Docker', 'Git'],
  },
  {
    id: 'occasional',
    label: 'When needed',
    items: ['GCP', 'Azure', 'Go', 'Puppet', 'Nomad', 'Cloud Build', 'CodePipeline'],
  },
  {
    id: 'learning',
    label: 'Learning',
    items: ['Go — writing more of it, slowly'],
  },
];

export const skillsOpinion =
  'Opinionated about: YAML is a bad config format and we all know it. We use it anyway.';

/**
 * Kept as data because the Person JSON-LD cites them, but presented as a
 * footnote rather than a badge wall. Nobody gets hired for AZ-104.
 */
export const certifications = [
  { name: 'Certified Kubernetes Administrator', short: 'CKA', issuer: 'CNCF' },
  { name: 'Certified Kubernetes Application Developer', short: 'CKAD', issuer: 'CNCF' },
  { name: 'Certified Kubernetes Security Specialist', short: 'CKS', issuer: 'CNCF' },
  { name: 'Azure DevOps Engineer Expert', short: 'AZ-400', issuer: 'Microsoft' },
  { name: 'Azure Administrator Associate', short: 'AZ-104', issuer: 'Microsoft' },
  { name: 'Red Hat Certified System Administrator', short: 'RHCSA', issuer: 'Red Hat' },
];

export const certsNote =
  'I have them. They helped me learn. But here is the truth: CKA taught me more than CKS, and AZ-400 taught me more than AZ-104. The hands-on ones matter. The associate-level ones are checkboxes.';

export const education = [
  {
    degree: 'B.Tech, Computer Science Engineering',
    school: 'JECRC University, Jaipur',
    year: '2020',
  },
];
