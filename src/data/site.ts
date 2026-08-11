export const site = {
  url: 'https://imsurajkr.github.io',
  title: 'Suraj Kumar — Senior Platform & DevOps Engineer',
  shortTitle: 'Suraj Kumar',
  tagline: 'Senior Platform & DevOps Engineer',
  description:
    'Suraj Kumar — Senior Platform & DevOps Engineer with 7+ years across AWS, GCP, Azure and Kubernetes. Platform engineering, Terraform, DevSecOps, CI/CD, and free browser-based DevOps tools.',
  keywords: [
    'Suraj Kumar',
    'DevOps Engineer',
    'Platform Engineering',
    'Kubernetes',
    'Terraform',
    'AWS',
    'GCP',
    'Azure',
    'DevSecOps',
    'SRE',
    'CKA',
    'CKS',
    'subnet calculator',
    'DevOps tools',
  ],
  locale: 'en_IN',
  ogImage: '/assets/images/meta.jpg',
  author: {
    name: 'Suraj Kumar',
    email: 'surajkumar.devp@gmail.com',
    phone: '+91-8290599756',
    location: 'Gurugram, India',
    image: '/assets/images/author.jpg',
  },
  social: {
    github: 'https://github.com/imsurajkr',
    linkedin: 'https://www.linkedin.com/in/dev-surajkumar/',
    twitter: 'https://twitter.com/imsurajkr',
    email: 'mailto:surajkumar.devp@gmail.com',
  },
} as const;

export const nav = [
  { href: '/', label: 'Resume' },
  { href: '/about', label: 'About' },
  { href: '/tools', label: 'Tools' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Secondary links — footer only, kept out of the main nav. */
export const footerNav = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/rss.xml', label: 'RSS' },
  { href: '/sitemap-index.xml', label: 'Sitemap' },
] as const;
