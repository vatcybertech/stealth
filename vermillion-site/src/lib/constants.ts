export const EASE = [0.22, 1, 0.36, 1] as const;

export const SITE = {
  name: "Vermillion Axis Technologies",
  tagline: "Infrastructure-Grade Software Engineering",
  description:
    "We build the systems that run your operation. Engineered for load, hardened for production, delivered with the source. No templates. No dependencies. No compromises.",
  domain: "vermillionaxis.tech",
  email: "contact@vermillionaxis.tech",
};

export const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "";

export const SERVICE_OPTIONS = [
  "Foundation ($2,500 – $5,000)",
  "Professional ($7,500 – $15,000)",
  "Enterprise ($20,000+)",
  "Custom engagement — request a briefing",
] as const;

export const NAV_LINKS = [
  { label: "Portfolio", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

export const STATS = [
  { value: "100+", label: "Systems Deployed" },
  { value: "<72hr", label: "Engagement to Kickoff" },
  { value: "3–21", label: "Day Delivery Window" },
  { value: "100%", label: "Code Ownership" },
];

export const SHOWCASE_ITEMS = [
  {
    label: "Analytics Dashboard",
    description:
      "Real-time telemetry, revenue attribution, and predictive modeling. Built to give decision-makers a single pane of glass over the entire operation.",
    category: "SaaS",
  },
  {
    label: "Enterprise CRM",
    description:
      "Multi-pipeline relationship intelligence with automated lifecycle workflows, granular RBAC, and audit-grade data integrity.",
    category: "Enterprise",
  },
  {
    label: "Member Portal",
    description:
      "Authenticated membership infrastructure — integrated billing, content gating, and role-based delivery. Zero third-party platform dependencies.",
    category: "Membership",
  },
  {
    label: "E-Commerce Platform",
    description:
      "Sub-second storefront with real-time inventory synchronization, payment orchestration, and conversion analytics baked into the architecture.",
    category: "E-Commerce",
  },
  {
    label: "Coaching Platform",
    description:
      "Full-stack operational system — scheduling engine, payment processing, branded document generation. One codebase running the entire business.",
    category: "Fitness",
  },
  {
    label: "Mobile Application",
    description:
      "Offline-first progressive web application with background sync, push notifications, and native-grade performance. No app store required.",
    category: "Mobile",
  },
];

export const TIERS = [
  {
    name: "Foundation",
    price: "$2,500 – $5,000",
    audience:
      "For operators who need a production-grade digital system — not a brochure site.",
    delivery: "3–7 days",
    features: [
      "Custom-engineered website or web application — zero templates",
      "Progressive Web App — installable on any device",
      "Integrated booking, scheduling, and intake systems",
      "Stripe payment infrastructure with webhook orchestration",
      "SEO architecture and sub-second load times",
      "Cloud hosting, managed database, and CI/CD pipeline",
      "Full source code, credentials, and infrastructure transfer on delivery",
    ],
  },
  {
    name: "Professional",
    price: "$7,500 – $15,000",
    audience:
      "For companies building the operational backbone their competitors cannot replicate.",
    delivery: "5–10 days",
    features: [
      "Everything in Foundation, plus:",
      "Full-stack operational command center with live dashboards",
      "Role-based access control and multi-tier user management",
      "Normalized relational database architecture and typed API layer",
      "Deep system integrations — CRM, payments, messaging, calendaring",
      "Automated workflow engine with event-driven scheduling",
      "Branded document and PDF generation pipeline",
      "Offline-first architecture with real-time data synchronization",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$20,000+",
    audience:
      "For organizations engineering platform-level infrastructure built to absorb scale.",
    delivery: "10–21 days",
    features: [
      "Everything in Professional, plus:",
      "Multi-tenant SaaS infrastructure with tenant isolation",
      "Administrative command panel with real-time operational analytics",
      "AI-driven automation and intelligent content generation",
      "Commerce engine with marketplace and vendor management capabilities",
      "Enterprise API integrations and custom middleware layer",
      "White-label and multi-brand architecture",
      "Security audit, penetration hardening, and compliance documentation",
    ],
  },
];

export const FEATURES = [
  {
    icon: "Layers",
    title: "Full-Stack Architecture",
    description:
      "Vertically integrated systems on React, Next.js, Node.js, and PostgreSQL. Every layer production-hardened. Every interface statically typed. No scaffolding left behind.",
  },
  {
    icon: "Zap",
    title: "Real-Time Systems",
    description:
      "WebSocket-driven dashboards, event-sourced state management, and sub-second data propagation. Your operation runs on live data, not polling intervals.",
  },
  {
    icon: "Cloud",
    title: "Cloud-Native Infrastructure",
    description:
      "Auto-scaling compute with zero-downtime deployments. Architected to absorb ten times your current load without human intervention or architectural changes.",
  },
  {
    icon: "Smartphone",
    title: "Progressive Web Apps",
    description:
      "Device-installable, offline-capable, push-enabled. Native application performance delivered through the browser. No app store gatekeeping. No review cycles.",
  },
  {
    icon: "Shield",
    title: "Hardened Security",
    description:
      "AES-256 encryption at rest and in transit. Role-based access control. Immutable audit trails. Defense-in-depth architecture engineered to withstand hostile environments.",
  },
  {
    icon: "Plug",
    title: "API Engineering",
    description:
      "RESTful and GraphQL interfaces, webhook orchestration, and middleware that integrates cleanly with any system exposing an endpoint. Documented. Versioned. Typed.",
  },
  {
    icon: "Brain",
    title: "AI-Powered Systems",
    description:
      "Production machine learning pipelines, intelligent document processing, and predictive models embedded directly into your operational workflow. Not bolted on — built in.",
  },
  {
    icon: "BarChart3",
    title: "Analytics & Intelligence",
    description:
      "Purpose-built dashboards and data visualization surfaces engineered around your operational metrics. Every chart answers a question. Every metric drives a decision.",
  },
];

export const PROCESS_STEPS = [
  {
    step: "01",
    title: "Discovery & Reconnaissance",
    description:
      "One focused briefing. We extract operational requirements, map technical constraints, identify integration surfaces, and define mission parameters. No discovery phases that bill by the hour.",
  },
  {
    step: "02",
    title: "System Architecture",
    description:
      "Within 24 hours: a complete system blueprint — data models, API contracts, infrastructure topology, security boundaries, and fixed-scope pricing. Every decision documented before a line of code is written.",
  },
  {
    step: "03",
    title: "Precision Engineering",
    description:
      "Systematic, milestone-driven construction. Every component tested in isolation, integrated under load, and validated against specification. Continuous deployment to a staging environment you can inspect in real time.",
  },
  {
    step: "04",
    title: "Production Deployment",
    description:
      "Zero-downtime launch with full asset transfer — codebase, credentials, infrastructure access, CI/CD pipeline, and technical documentation. Complete operational handoff. You own every line.",
  },
  {
    step: "05",
    title: "Sustained Operations",
    description:
      "Ongoing monitoring, performance optimization, and feature engineering. Month-to-month. No contracts. Disengage at any time with zero penalty and zero data loss.",
  },
];

export const COMPARISON = [
  {
    feature: "Delivery timeline",
    others: "6–16 weeks",
    ours: "3–21 days",
  },
  {
    feature: "Code ownership",
    others: "Licensed or platform-locked",
    ours: "100% yours — every line, every credential",
  },
  {
    feature: "Contractual lock-in",
    others: "Annual contracts",
    ours: "None. Month-to-month or zero obligation",
  },
  {
    feature: "Change velocity",
    others: "Paid change orders, 2-week cycles",
    ours: "Continuous deployment, same-day iterations",
  },
  {
    feature: "Technology stack",
    others: "Template-based or offshore assembly",
    ours: "Custom-engineered, statically typed, documented",
  },
  {
    feature: "Post-launch engineering",
    others: "Retainer required, scope renegotiation",
    ours: "Flexible monthly engagement, no minimums",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Eleven days. Full platform — scheduling, payments, branded exports. Our previous vendor quoted four months at three times the cost. My entire team runs their day out of this system now.",
    name: "Michael K.",
    title: "Founder, Coaching Lab",
  },
  {
    quote:
      "I did not need a website. I needed an operational system that mirrored how my business actually works — client intake, progress tracking, automated follow-ups. Vermillion mapped the requirements in a single call and delivered exactly that. No translation layer required.",
    name: "Rachel Chen",
    title: "Founder, Elevate Wellness",
    location: "Scottsdale",
  },
  {
    quote:
      "The document generation pipeline alone changed how we operate. Professionally branded deliverables generated on demand with our full identity system. Clients assume we have an entire design department. We do not. We have Vermillion.",
    name: "David Okafor",
    title: "CEO, Okafor Digital",
    location: "Austin",
  },
];

export const FAQ_ITEMS = [
  {
    question: "Do I own the code?",
    answer:
      "Entirely. Full codebase, deployment credentials, and infrastructure access transferred on delivery. Your intellectual property. No licensing. No dependencies on us.",
  },
  {
    question: "How do you deliver this fast?",
    answer:
      "Proprietary component libraries, battle-tested architecture patterns, and purpose-built tooling eliminate the cold-start problem. We deploy proven, production-grade systems — not prototypes.",
  },
  {
    question: "What happens after launch?",
    answer:
      "You hold the source code. Any qualified engineer can extend it. If you want us to continue building, we offer month-to-month engineering support with no minimums and no lock-in.",
  },
  {
    question: "What is the technology stack?",
    answer:
      "React, Next.js, and TypeScript on the frontend. Node.js with PostgreSQL or Firebase on the backend. Statically typed end-to-end, fully documented, and built for decade-scale maintainability.",
  },
  {
    question: "Can you integrate with our existing systems?",
    answer:
      "If it has an API, we connect to it. Production integrations with Stripe, Twilio, Google Calendar, Salesforce, HubSpot, Shopify, and dozens of other platforms already in our deployment history.",
  },
  {
    question: "How long does a project take?",
    answer:
      "Three to twenty-one days. Foundation systems ship in under a week. Enterprise platforms deliver within three weeks. We commit to a date and we hold it.",
  },
];
