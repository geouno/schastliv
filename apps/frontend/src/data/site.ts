// Site content and configuration data

import type { GlitchTextOptions } from "../lib/glitch-text";

export interface NavLink {
  href: string;
  text: string;
  group?: "main" | "right";
}

export interface MarqueeItem {
  text: string;
}

export interface Thesis {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface ArchitectureColumn {
  label: string;
  heading: string;
  description: string;
}

export interface WorkflowStep {
  id: string;
  action: string;
  description: string;
}

export interface WorkflowOutput {
  video_id: string;
  timestamps: Array<{ time: string; title: string; context: string }>;
}

export interface FooterData extends GlitchTextOptions {}

export const site = {
  navigation: {
    logo: "Schastliv.",
    links: [
      { href: "#", text: "Home", group: "main" },
      { href: "#architecture", text: "How it works", group: "main" },
      { href: "#demo", text: "Demo", group: "main" },
      { href: "https://github.com/geouno/schastliv", text: "GitHub", group: "right" },
    ] as NavLink[],
  },

  marquee: {
    items: [
      "SELF-HOSTED",
      "TYPE-SAFE",
      "ZERO CONFIGURATION",
      "CLOUDFLARE TUNNEL",
      "LOCAL INFRASTRUCTURE",
    ],
  },

  hero: {
    title: "Own your AI workflows.",
    subtitle: "Seamlessly integrate specialized compute.",
    tagline:
      // Commented out for conciseness
      // "Extend AI SDK workflows with remote steps.\n" +
      "Offload what serverless can't handle\nto GPUs, on-prem, or private infra.\n" +
      "End-to-end type-safe, securely tunnelled,\nand resolved back to your backend.",
  },

  architecture: {
    thesis: {
      id: "ARCH_001",
      title: "THESIS",
      paragraphs: [
        "Backend deployments cannot accommodate every specialized workload. Certain tasks require local compute, proprietary models, or hardware acceleration that serverless environments cannot provide.",
        "Schastliv is the missing piece. Run specialized workflow steps on your machine. Integrate them seamlessly with your AI SDK pipelines.",
      ],
    } as Thesis,
    columns: [
      {
        label: "EXECUTION",
        heading: "OpenCode",
        description:
          "Agentic execution on your infra with filesystem and command access. A comprehensive runner you can talk to, where your data lives.",
      },
      {
        label: "TRANSIT",
        heading: "Cloudflare",
        description:
          "Secure tunneling to your compute. No public exposure. No port forwarding. Zero configuration.",
      },
      {
        label: "ADAPTER",
        heading: "AI SDK",
        description:
          "End-to-end type safety. Steps resolve back to your backend as if deployed together. No API boundaries.",
      },
    ] as ArchitectureColumn[],
  },

  workflow: {
    useCase: {
      label: "USE_CASE",
      title: "YouTube Timestamp Generator",
    },
    steps: [
      {
        id: "STEP_01",
        action: "RETRIEVE",
        description: "Fetch transcript from video source.",
      },
      {
        id: "STEP_02",
        action: "CHUNK",
        description: "Segment transcript into processable units.",
      },
      {
        id: "STEP_03",
        action: "ANALYZE",
        description: "Identify sections. Generate titles. Preserve context.",
      },
      {
        id: "STEP_04",
        action: "MERGE",
        description: "Compile into structured output with timestamps.",
      },
    ] as WorkflowStep[],
    output: {
      video_id: "abc123",
      timestamps: [
        { time: "0:00", title: "Introduction", context: "..." },
        { time: "2:34", title: "Core Concept", context: "..." },
        { time: "8:15", title: "Implementation", context: "..." },
      ],
    } as WorkflowOutput,
  },

  tagline: {
    headline: "Infrastructure should not be a constraint.",
    subline: "Your workflows. Your compute. Your control.",
  },

  footer: {
    // Double morph: Cyrillic → Romanized → English
    textA: "“Schastlivyy pervenets tvoren'ya!”", // Initial (Romanized)
    textB: "«Счастливый первенец творенья!»", // Intermediate (Cyrillic)
    textC: "“The happy firstborn of creation!”", // Final (English)
  } as FooterData,
};
