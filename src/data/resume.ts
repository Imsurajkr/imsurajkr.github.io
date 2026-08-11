export type Tone = 'neutral' | 'signal' | 'health' | 'guard';

export interface Role {
  title: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  current?: boolean;
  summary?: string;
  highlights: string[];
  stack: string[];
}

export interface Engagement {
  client: string;
  role: string;
  duration: string;
  highlights: string[];
}

/** A layer in a project's architecture diagram: one column of the flow. */
export interface ArchLayer {
  label: string;
  nodes: { label: string; tone?: Tone }[];
}

export interface Project {
  slug: string;
  name: string;
  thesis: string;
  context: string;
  /** What was actually broken or missing. */
  problem: string;
  /** Engineering decisions and the reasoning behind them. */
  decisions: { title: string; body: string }[];
  /** Measurable or concrete results. */
  outcomes: { value: string; label: string }[];
  architecture: ArchLayer[];
  stack: string[];
}

export const profile = {
  headline: 'Senior Platform & DevOps Engineer',
  summary:
    'Platform and DevOps engineer with 7+ years building scalable, highly available cloud infrastructure across AWS, GCP and Azure. I design self-service capabilities that let engineering teams ship without filing tickets — Infrastructure as Code with Terraform, hardened Kubernetes platforms, DevSecOps guardrails and CI/CD that people actually trust. I have run mission-critical systems for a regulated bank, driven FinOps cost programmes, and led DevOps teams across concurrent client engagements.',
  stats: [
    { value: '7+', label: 'Years in platform & DevOps' },
    { value: '3', label: 'Clouds run in production' },
    { value: '10+', label: 'Kubernetes clusters operated' },
    { value: '6', label: 'Professional certifications' },
  ],
};

/**
 * Capability domains — what he is *for*, stated before where he has worked.
 */
export const focusAreas = [
  {
    id: 'platform',
    label: 'Platform Engineering',
    tone: 'signal' as Tone,
    thesis: 'Paved roads, not ticket queues.',
    body: 'Golden Terraform modules, self-service APIs and sane defaults so product teams provision and ship on their own. The best platform team is the one engineers rarely need to talk to.',
    proof: ['FastAPI Kubernetes control plane', 'Reusable Terraform modules', 'GitOps delivery'],
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes & Delivery',
    tone: 'signal' as Tone,
    thesis: 'Releases that nobody has to stay up for.',
    body: 'EKS, AKS and GKE in production, fronted by Kong and Istio, delivered Blue-Green so a bad release is a switch flip rather than an incident.',
    proof: ['Zero-downtime Blue-Green', 'Kong API Gateway', 'Istio service mesh', 'CKA · CKS · CKAD'],
  },
  {
    id: 'security',
    label: 'DevSecOps',
    tone: 'guard' as Tone,
    thesis: 'Guardrails in the pipeline, not in a review meeting.',
    body: 'Live CVE visibility across the container estate, OIDC-based access, and backup automation that satisfies an auditor as readily as a recovery drill.',
    proof: ['Real-time CVE platform', 'OIDC / OpenID Connect', 'Compliance-grade backups'],
  },
  {
    id: 'reliability',
    label: 'Reliability & FinOps',
    tone: 'health' as Tone,
    thesis: 'Cost and uptime are the same design conversation.',
    body: 'Monitoring that catches degradation before customers do, and right-sizing work that treats spend as an engineering metric sitting next to latency and availability.',
    proof: ['Custom health monitoring', 'Cloud cost optimisation', 'SRE practice'],
  },
];

export const experience: Role[] = [
  {
    title: 'DevOps Engineer 2',
    company: 'Kotak Mahindra Bank',
    location: 'Gurugram, India',
    start: 'Oct 2024',
    end: 'Present',
    current: true,
    summary:
      'Platform and security engineering for regulated banking workloads, where downtime and unpatched CVEs are both audit findings.',
    highlights: [
      'Designed and operate critical edge infrastructure — Kong API Gateway and Istio service mesh — handling north-south and east-west traffic for banking services.',
      'Implemented Blue-Green deployment strategies delivering zero-downtime releases on customer-facing systems.',
      'Architected a compliance application giving security and engineering teams real-time visibility into Common Vulnerabilities and Exposures across the container estate.',
      'Automated data protection by scheduling dumps of Kubernetes-provisioned databases into AWS S3 with lifecycle policies, satisfying compliance retention and disaster-recovery requirements.',
      'Built automation workflows for infrastructure provisioning and application deployment, cutting manual handoffs between platform and product teams.',
    ],
    stack: ['Kubernetes', 'Kong', 'Istio', 'AWS S3', 'Blue-Green', 'Python', 'DevSecOps'],
  },
  {
    title: 'Lead DevOps Engineer',
    company: 'FiftyFive Technologies',
    location: 'India',
    start: 'Jul 2020',
    end: 'Oct 2024',
    summary:
      'Led a DevOps team delivering multi-cloud platforms for concurrent client engagements, owning everything from Terraform modules to on-call reliability.',
    highlights: [
      'Managed production resources across Azure, AWS and GCP — including AKS, EKS and GKE clusters — as the single platform team for multiple clients.',
      'Led CI/CD across Cloud Build, Azure DevOps and AWS CodePipeline, standardising multi-cloud deployment patterns rather than reinventing per project.',
      'Developed scalable, client-facing APIs in Python and FastAPI to manage Kubernetes resources programmatically, turning repetitive platform requests into self-service endpoints.',
      'Deployed Kubeflow for ML workflows and integrated user authentication with OpenID Connect (OIDC).',
      'Implemented Infrastructure as Code with Terraform and automated provisioning end to end.',
      'Owned site reliability, monitoring systems and cost optimisation strategies across the client portfolio.',
      'Led the DevOps team and ran multiple concurrent projects without dropping delivery commitments.',
    ],
    stack: [
      'Terraform',
      'AKS / EKS / GKE',
      'Azure DevOps',
      'Cloud Build',
      'CodePipeline',
      'FastAPI',
      'Kubeflow',
      'OIDC',
    ],
  },
  {
    title: 'DevOps Developer',
    company: 'RoboMQ',
    location: 'India',
    start: 'Jan 2020',
    end: 'May 2020',
    summary: 'First DevOps role — containerisation and cloud operations alongside the platform team.',
    highlights: [
      'Created and optimised Dockerfiles for frontend applications, reducing image size and build time.',
      'Managed Google Cloud services and AWS EKS clusters.',
      'Contributed to deployment automation and CI/CD pipeline improvements.',
    ],
    stack: ['Docker', 'GCP', 'AWS EKS', 'CI/CD'],
  },
];

export const engagements: Engagement[] = [
  {
    client: 'Apica',
    role: 'DevOps Engineer',
    duration: '1,075 days',
    highlights: [
      'Maintained Puppet repositories and optimised cloud resource usage for cost efficiency.',
      'Built a custom health monitoring application in Python that polls Nomad and Puppet and pushes into alerting — turning silent failures into proactive incidents.',
    ],
  },
  {
    client: 'NIBE',
    role: 'Cloud Engineer',
    duration: '1,835 days',
    highlights: [
      'Managed Azure resources for the NIBE and NIBE Professional Platform products.',
      'Ran provisioning, environment management and reliability for long-lived platform workloads.',
    ],
  },
];

export const projects: Project[] = [
  {
    slug: 'cve-visibility',
    name: 'CVE Visibility & Compliance Platform',
    thesis: 'Turning a quarterly PDF scan report into a live view of actual exposure.',
    context: 'Kotak Mahindra Bank · 2025',
    problem:
      'Vulnerability posture was known only from periodic scan reports that were stale the day they landed. Nobody could answer "is that CVE running in production right now, and where" without manual cross-referencing between a scanner and the cluster.',
    decisions: [
      {
        title: 'Correlate against running workloads, not registries',
        body: 'Scanning images in a registry tells you what might be vulnerable. Joining scan results against what is actually scheduled in the cluster tells you what is exposed — a far shorter and more actionable list.',
      },
      {
        title: 'Prioritise by exposure, not raw CVSS',
        body: 'A critical CVE in an internal batch job outranks nothing. Severity is weighted by whether the workload is internet-facing, so remediation effort follows real risk.',
      },
      {
        title: 'Built for the auditor as well as the engineer',
        body: 'The same data backs both the engineering triage view and the evidence a banking regulator asks for, so compliance reporting stopped being a separate manual exercise.',
      },
    ],
    outcomes: [
      { value: 'Real-time', label: 'Posture visibility' },
      { value: 'Single', label: 'Source of truth' },
      { value: 'Audit', label: 'Ready evidence' },
    ],
    architecture: [
      {
        label: 'Sources',
        nodes: [{ label: 'Image scanner' }, { label: 'Registry' }, { label: 'K8s API' }],
      },
      {
        label: 'Correlation',
        nodes: [{ label: 'CVE service', tone: 'signal' }, { label: 'Risk scoring', tone: 'guard' }],
      },
      {
        label: 'Consumers',
        nodes: [
          { label: 'Security dashboard', tone: 'health' },
          { label: 'Audit export' },
          { label: 'Alerting' },
        ],
      },
    ],
    stack: ['Python', 'Kubernetes API', 'Container scanning', 'DevSecOps'],
  },
  {
    slug: 'k8s-self-service',
    name: 'Kubernetes Self-Service API',
    thesis: 'A governed control plane so product teams stop filing platform tickets.',
    context: 'FiftyFive Technologies · multi-client',
    problem:
      'One platform team supported several client engagements at once. Routine requests — namespaces, scaling, config, inspecting a failing workload — arrived as tickets and chat messages, making the platform team the bottleneck for everyone else\'s delivery.',
    decisions: [
      {
        title: 'An API, not a wiki page',
        body: 'Documentation asks people to do the work correctly; an endpoint does it correctly by construction. FastAPI gave typed request validation and generated docs, so the interface explained itself.',
      },
      {
        title: 'One abstraction over three clouds',
        body: 'Teams targeted EKS, AKS and GKE. Exposing one consistent resource model meant developers never had to learn which cloud their cluster happened to run on.',
      },
      {
        title: 'Guardrails inside the endpoint',
        body: 'Quotas, naming and permission boundaries are enforced by the service rather than by review. Self-service without governance is just a faster way to create drift.',
      },
    ],
    outcomes: [
      { value: 'Self-serve', label: 'Namespace + workload ops' },
      { value: '3 clouds', label: 'One interface' },
      { value: 'Bottleneck', label: 'Removed from delivery' },
    ],
    architecture: [
      {
        label: 'Clients',
        nodes: [{ label: 'Product teams' }, { label: 'CI pipelines' }],
      },
      {
        label: 'Control plane',
        nodes: [
          { label: 'FastAPI service', tone: 'signal' },
          { label: 'OIDC auth', tone: 'guard' },
          { label: 'Policy / quota', tone: 'guard' },
        ],
      },
      {
        label: 'Targets',
        nodes: [{ label: 'EKS' }, { label: 'AKS' }, { label: 'GKE' }],
      },
    ],
    stack: ['Python', 'FastAPI', 'Kubernetes API', 'OIDC', 'Terraform'],
  },
  {
    slug: 'health-monitoring',
    name: 'Service Health Monitoring System',
    thesis: 'Catching silent infrastructure failures before they became outages.',
    context: 'Apica engagement · 1,075 days',
    problem:
      'Nomad and Puppet failures were discovered reactively — usually when something downstream broke. There was no continuous signal on whether the orchestration and configuration layer was actually healthy across the fleet.',
    decisions: [
      {
        title: 'Poll the services that everything else depends on',
        body: 'Monitoring applications while ignoring the scheduler and config-management layer leaves the most consequential failures invisible. The monitor targets the dependencies, not just the dependents.',
      },
      {
        title: 'Alert into the existing pipeline',
        body: 'A new dashboard nobody watches is not monitoring. Output went into the alerting system engineers already responded to, so detection turned directly into action.',
      },
      {
        title: 'Paired with cost work',
        body: 'The same fleet visibility that surfaced failures also exposed idle and oversized resources, which fed the cloud cost optimisation effort.',
      },
    ],
    outcomes: [
      { value: 'Proactive', label: 'Incident detection' },
      { value: 'Fleet-wide', label: 'Nomad + Puppet health' },
      { value: 'Lower', label: 'Cloud spend' },
    ],
    architecture: [
      {
        label: 'Fleet',
        nodes: [{ label: 'Nomad' }, { label: 'Puppet' }, { label: 'Cloud resources' }],
      },
      {
        label: 'Collector',
        nodes: [{ label: 'Python monitor', tone: 'signal' }, { label: 'Status evaluation' }],
      },
      {
        label: 'Response',
        nodes: [{ label: 'Alerting', tone: 'health' }, { label: 'Cost review' }],
      },
    ],
    stack: ['Python', 'Nomad', 'Puppet', 'Alerting', 'FinOps'],
  },
  {
    slug: 'secure-iot',
    name: 'Secure IoT Ecosystem on Azure',
    thesis: 'Zero-touch device onboarding at scale, without shipping shared secrets.',
    context: 'NIBE · Azure platform',
    problem:
      'Connecting a growing device fleet securely is the hard part of IoT. Manual per-device provisioning does not scale, and a shared credential baked into firmware becomes a single catastrophic key.',
    decisions: [
      {
        title: 'Device Provisioning Service over manual registration',
        body: 'DPS lets each device attest and receive its own identity on first boot. Onboarding scales with the fleet instead of with operator time, and there is no shared secret to leak.',
      },
      {
        title: 'Separate ingestion from processing',
        body: 'IoT Hub absorbs device traffic; backend services on AKS scale independently behind it. A spike in device chatter does not force the application tier to scale in lockstep.',
      },
      {
        title: 'Microservices on AKS for availability',
        body: 'Backend processing was decomposed and deployed for high availability, so a single failing consumer degrades one function rather than the whole platform.',
      },
    ],
    outcomes: [
      { value: 'Zero-touch', label: 'Device provisioning' },
      { value: 'Per-device', label: 'Identity, no shared key' },
      { value: 'Independent', label: 'Backend scaling' },
    ],
    architecture: [
      {
        label: 'Edge',
        nodes: [{ label: 'IoT devices' }, { label: 'Azure DPS', tone: 'guard' }],
      },
      {
        label: 'Ingest',
        nodes: [{ label: 'Azure IoT Hub', tone: 'signal' }],
      },
      {
        label: 'Processing',
        nodes: [{ label: 'AKS microservices', tone: 'signal' }, { label: 'Storage' }],
      },
    ],
    stack: ['Azure IoT Hub', 'Azure DPS', 'AKS', 'IoT security'],
  },
  {
    slug: 'backup-automation',
    name: 'Kubernetes Backup Automation',
    thesis: 'Backups that satisfy a recovery drill and an auditor with the same evidence.',
    context: 'Kotak Mahindra Bank',
    problem:
      'Databases provisioned inside the cluster had no consistent, verifiable backup path. In a regulated environment that is simultaneously a recovery risk and an audit finding.',
    decisions: [
      {
        title: 'Scheduled in-cluster dumps as CronJobs',
        body: 'Running the backup where the database lives avoids brittle external access paths and keeps the job lifecycle managed by the same system that manages the workload.',
      },
      {
        title: 'S3 lifecycle policies as the retention control',
        body: 'Retention is expressed as infrastructure configuration rather than as a documented human process, so the control cannot silently drift out of compliance.',
      },
      {
        title: 'Recovery objectives drove the schedule',
        body: 'Backup frequency was derived from the acceptable recovery point, not chosen by convention — the schedule is an answer to a stated RPO.',
      },
    ],
    outcomes: [
      { value: 'Unattended', label: 'Scheduled dumps' },
      { value: 'Enforced', label: 'Retention policy' },
      { value: 'Shorter', label: 'Recovery time objective' },
    ],
    architecture: [
      {
        label: 'Source',
        nodes: [{ label: 'In-cluster DBs' }],
      },
      {
        label: 'Job',
        nodes: [{ label: 'K8s CronJob', tone: 'signal' }, { label: 'Dump + compress' }],
      },
      {
        label: 'Retention',
        nodes: [
          { label: 'AWS S3', tone: 'guard' },
          { label: 'Lifecycle policy', tone: 'guard' },
          { label: 'DR restore', tone: 'health' },
        ],
      },
    ],
    stack: ['Kubernetes', 'CronJobs', 'AWS S3', 'Bash'],
  },
  {
    slug: 'devlogger',
    name: 'DevLogger — Log Management System',
    thesis: 'Company-wide developer log management, decoupled by a message queue.',
    context: 'RoboMQ internship · MEAN stack',
    problem:
      'Logs created by developers across the company lived in scattered places with no shared record and no way to be notified about your own entries.',
    decisions: [
      {
        title: 'RabbitMQ between ingestion and notification',
        body: 'Queueing the notification work meant a slow or failing mail path could never block or lose a log write — the two concerns fail independently.',
      },
      {
        title: 'Per-developer email digests',
        body: 'Notification is scoped to the logs you created, so the system stays useful instead of becoming noise everyone filters away.',
      },
    ],
    outcomes: [
      { value: 'Central', label: 'Company-wide logs' },
      { value: 'Decoupled', label: 'Ingest from notify' },
      { value: 'First', label: 'Production system built' },
    ],
    architecture: [
      {
        label: 'Input',
        nodes: [{ label: 'Angular UI' }, { label: 'Express API' }],
      },
      {
        label: 'Queue',
        nodes: [{ label: 'RabbitMQ', tone: 'signal' }],
      },
      {
        label: 'Output',
        nodes: [{ label: 'MongoDB' }, { label: 'Email digest', tone: 'health' }],
      },
    ],
    stack: ['MongoDB', 'Express', 'Angular', 'Node.js', 'RabbitMQ'],
  },
];

export const skillGroups = [
  {
    name: 'Cloud Platforms',
    items: ['AWS', 'GCP', 'Azure', 'Oracle Cloud'],
  },
  {
    name: 'Containers & Orchestration',
    items: ['Kubernetes', 'EKS', 'AKS', 'GKE', 'Docker', 'Docker Compose', 'Istio'],
  },
  {
    name: 'Infrastructure as Code',
    items: ['Terraform', 'Puppet'],
  },
  {
    name: 'CI/CD & Automation',
    items: [
      'Jenkins',
      'Azure DevOps',
      'Cloud Build',
      'AWS CodePipeline',
      'GitOps',
      'Fastlane',
      'SonarQube',
    ],
  },
  {
    name: 'Programming & Scripting',
    items: ['Python', 'FastAPI', 'Bash', 'Go'],
  },
  {
    name: 'Deployment Strategies',
    items: ['Blue-Green', 'Microservices', 'Kubeflow'],
  },
  {
    name: 'Reliability & FinOps',
    items: ['SRE practice', 'Cost optimisation', 'Logging', 'Monitoring'],
  },
  {
    name: 'Platform & Security',
    items: ['Kong API Gateway', 'OIDC', 'RabbitMQ', 'DevSecOps'],
  },
];

export const certifications = [
  {
    name: 'Certified Kubernetes Administrator',
    short: 'CKA',
    issuer: 'CNCF / Linux Foundation',
    domain: 'Containers & Orchestration',
  },
  {
    name: 'Certified Kubernetes Security Specialist',
    short: 'CKS',
    issuer: 'CNCF / Linux Foundation',
    domain: 'Platform & Security',
  },
  {
    name: 'Certified Kubernetes Application Developer',
    short: 'CKAD',
    issuer: 'CNCF / Linux Foundation',
    domain: 'Containers & Orchestration',
  },
  {
    name: 'Azure DevOps Engineer Expert',
    short: 'AZ-400',
    issuer: 'Microsoft',
    domain: 'CI/CD & Automation',
  },
  {
    name: 'Azure Administrator Associate',
    short: 'AZ-104',
    issuer: 'Microsoft',
    domain: 'Cloud Platforms',
  },
  {
    name: 'Red Hat Certified System Administrator',
    short: 'RHCSA',
    issuer: 'Red Hat',
    domain: 'Systems',
  },
];

export const education = [
  {
    degree: 'B.Tech, Computer Science Engineering',
    school: 'JECRC University, Jaipur',
    year: '2020',
  },
];
