// 📁 lib/packages.tsx (rename to .tsx since it contains JSX)
import React from "react";
import {
  Cpu,
  Briefcase,
  TrendingUp,
  Sun,
  Users,
  Mic,
  FileText
} from "lucide-react";

export type PackageId =
  | "sandbox"
  | "clientProject"
  | "analyzingTrends"
  | "summer"
  | "workshop"
  | "classroomSpeaker"
  | "substack";

export interface Package {
  id: PackageId;
  name: string;
  description: string;
  priceId?: string;

  monthlyPrice?: number;
  maxGpts: number;
  duration: string;
  gptIds: string[];
  aiCredits: number;
  features: string[];
  icon: React.ReactElement; // Change from React.ReactNode to React.ReactElement
  color: string;
  badge: string;
  isPaid: boolean;
  hasTrial?: boolean;
  isEducational?: boolean;
  isTemporary?: boolean;
}

// Helper function to create icons
const createIcon = (
  IconComponent: React.ComponentType<{ className?: string }>,
  className = "w-5 h-5"
) => React.createElement(IconComponent, { className });

export const PACKAGES: Record<PackageId, Package> = {
  sandbox: {
    id: "sandbox",
    name: "SandBox Level",
    description: "Professional sandbox for AI development",
    priceId: process.env.STRIPE_PRICE_SANDBOX_LEVEL_MONTHLY!,
    monthlyPrice: 500,
    maxGpts: 12,
    duration: "Monthly",
    gptIds: Array(12)
      .fill("")
      .map((_, i) => `gpu-${i + 1}`),
    aiCredits: 50000,
    features: [
      "12 GPUs access",
      "50,000 AI credits/month",
      "Priority support",
      "Custom agent training",
      "API access",
      "Unlimited projects",
      "Advanced analytics",
      "Team collaboration (up to 10 users)"
    ],
    icon: createIcon(Cpu),
    color: "purple",
    badge: "Professional",
    isPaid: true
  },
  clientProject: {
    id: "clientProject",
    name: "Client Project GPTs",
    description: "Individual GPT for client projects",
    priceId: process.env.STRIPE_PRICE_CLIENT_PROJECT_GPT_MONTHLY!,
    monthlyPrice: 49,
    maxGpts: 1,
    duration: "30-day trial",
    gptIds: ["client-project"],
    aiCredits: 1000,
    features: [
      "1 GPT for client projects",
      "1,000 AI credits",
      "30-day free trial",
      "Converts to paid after trial",
      "Email support",
      "Basic templates",
      "Project management tools"
    ],
    icon: createIcon(Briefcase),
    color: "blue",
    badge: "Trial",
    isPaid: true,
    hasTrial: true
  },
  analyzingTrends: {
    id: "analyzingTrends",
    name: "Analyzing Trends SandBox",
    description: "Educational access for trend analysis",
    maxGpts: 4,
    duration: "5-month semester",
    gptIds: [
      "trend-analysis-1",
      "trend-analysis-2",
      "trend-analysis-3",
      "trend-analysis-4"
    ],
    aiCredits: 5000,
    features: [
      "4 GPUs for trend analysis",
      "5,000 AI credits total",
      "Free for 5 months",
      "Academic use only",
      "Research tools",
      "Data visualization",
      "Export capabilities"
    ],
    icon: createIcon(TrendingUp),
    color: "green",
    badge: "Free",
    isPaid: false,
    isEducational: true,
    priceId: "30-day-trend-analysis-free"
  },
  summer: {
    id: "summer",
    name: "Summer SandBox",
    description: "Summer program access",
    maxGpts: 3,
    duration: "3-month semester",
    gptIds: ["summer-project-1", "summer-project-2", "summer-project-3"],
    aiCredits: 3000,
    features: [
      "3 GPUs for summer projects",
      "3,000 AI credits total",
      "Free for 3 months",
      "Summer program access",
      "Project templates",
      "Mentor support",
      "Portfolio building"
    ],
    icon: createIcon(Sun),
    color: "yellow",
    badge: "Free",
    isPaid: false,
    isEducational: true
  },
  workshop: {
    id: "workshop",
    name: "Workshop GPTs",
    description: "Workshop and training access",
    maxGpts: 4,
    duration: "36 days (3 + 30)",
    gptIds: ["workshop-1", "workshop-2", "workshop-3", "workshop-4"],
    aiCredits: 2000,
    features: [
      "4 GPUs for workshops",
      "2,000 AI credits total",
      "Free for 33 days",
      "Workshop materials",
      "Hands-on training",
      "Certificate of completion",
      "Community access"
    ],
    icon: createIcon(Users),
    color: "orange",
    badge: "Free",
    isPaid: false,
    isTemporary: true
  },
  classroomSpeaker: {
    id: "classroomSpeaker",
    name: "Classroom Speaker GPT",
    description: "Educational speaker access",
    maxGpts: 1,
    duration: "15 days (1 + 14)",
    gptIds: ["classroom-speaker"],
    aiCredits: 500,
    features: [
      "1 GPT for classroom use",
      "500 AI credits total",
      "Free for 15 days",
      "Educational content",
      "Presentation tools",
      "Q&A capabilities",
      "Student engagement"
    ],
    icon: createIcon(Mic),
    color: "red",
    badge: "Free",
    isPaid: false,
    isEducational: true
  },
  substack: {
    id: "substack",
    name: "Substack GPT",
    description: "Content creation assistant",
    maxGpts: 1,
    duration: "14 days",
    gptIds: ["substack-writer"],
    aiCredits: 500,
    features: [
      "1 GPT for Substack writing",
      "500 AI credits total",
      "Free for 14 days",
      "Content generation",
      "SEO optimization",
      "Newsletter templates",
      "Audience analytics"
    ],
    icon: createIcon(FileText),
    color: "pink",
    badge: "Free",
    isPaid: false,
    isTemporary: true
  }
};
export const PACKAGES_UI: Record<PackageId, Omit<Package, "priceId">> = {
  sandbox: {
    id: "sandbox",
    name: "SandBox Level",
    description: "12 GPTs",
    maxGpts: 12,
    duration: "Monthly",
    monthlyPrice: 500,
    aiCredits: 50000,
    gptIds: Array(12)
      .fill("")
      .map((_, i) => `gpu-${i + 1}`),
    features: [
      "12 GPTs",
      "50,000 AI credits/month",
      "Priority support",
      "Custom agent training",
      "API access",
      "Unlimited projects",
      "Advanced analytics",
      "Team collaboration (up to 10 users)"
    ],
    icon: createIcon(Cpu),
    color: "purple",
    badge: "Paid",
    isPaid: true
  },

  clientProject: {
    id: "clientProject",
    name: "Client Project GPTs",
    description: "1 GPT",
    maxGpts: 1,
    duration: "30-day trial",
    monthlyPrice: 49,
    aiCredits: 1000,
    gptIds: ["client-project"],
    features: [
      "1 GPT",
      "1,000 AI credits",
      "30-day trial",
      "Converts to paid after trial",
      "Email support",
      "Basic templates",
      "Project management tools"
    ],
    icon: createIcon(Briefcase),
    color: "blue",
    badge: "Trial",
    isPaid: true,
    hasTrial: true
  },

  analyzingTrends: {
    id: "analyzingTrends",
    name: "Analyzing Trends SandBox",
    description: "4 GPTs",
    maxGpts: 4,
    duration: "5-month semester",
    aiCredits: 5000,
    gptIds: [
      "trend-analysis-1",
      "trend-analysis-2",
      "trend-analysis-3",
      "trend-analysis-4"
    ],
    features: [
      "4 GPTs",
      "5,000 AI credits total",
      "Free for 5 months",
      "Academic use only",
      "Research tools",
      "Data visualization",
      "Export capabilities"
    ],
    icon: createIcon(TrendingUp),
    color: "green",
    badge: "Free",
    isPaid: false,
    isEducational: true
  },

  summer: {
    id: "summer",
    name: "Summer SandBox",
    description: "3 GPTs",
    maxGpts: 3,
    duration: "3-month semester",
    aiCredits: 3000,
    gptIds: ["summer-project-1", "summer-project-2", "summer-project-3"],
    features: [
      "3 GPTs",
      "3,000 AI credits total",
      "Free for 3 months",
      "Summer program access",
      "Project templates",
      "Mentor support",
      "Portfolio building"
    ],
    icon: createIcon(Sun),
    color: "yellow",
    badge: "Free",
    isPaid: false,
    isEducational: true
  },

  workshop: {
    id: "workshop",
    name: "Workshop GPTs",
    description: "4 GPTs",
    maxGpts: 4,
    duration: "3-days + 30 days",
    aiCredits: 2000,
    gptIds: ["workshop-1", "workshop-2", "workshop-3", "workshop-4"],
    features: [
      "4 GPTs",
      "2,000 AI credits total",
      "Free for 33 days",
      "Workshop materials",
      "Hands-on training",
      "Certificate of completion",
      "Community access"
    ],
    icon: createIcon(Users),
    color: "orange",
    badge: "Free",
    isPaid: false,
    isTemporary: true
  },

  classroomSpeaker: {
    id: "classroomSpeaker",
    name: "Classroom Speaker GPT",
    description: "1 GPT",
    maxGpts: 1,
    duration: "1-day + 14 days",
    aiCredits: 500,
    gptIds: ["classroom-speaker"],
    features: [
      "1 GPT",
      "500 AI credits total",
      "Free for 15 days",
      "Educational content",
      "Presentation tools",
      "Q&A capabilities",
      "Student engagement"
    ],
    icon: createIcon(Mic),
    color: "red",
    badge: "Free",
    isPaid: false,
    isEducational: true
  },

  substack: {
    id: "substack",
    name: "Substack GPT",
    description: "1 GPT",
    maxGpts: 1,
    duration: "14 days",
    aiCredits: 500,
    gptIds: ["substack-writer"],
    features: [
      "1 GPT",
      "500 AI credits total",
      "Free for 14 days",
      "Content generation",
      "SEO optimization",
      "Newsletter templates",
      "Audience analytics"
    ],
    icon: createIcon(FileText),
    color: "pink",
    badge: "Free",
    isPaid: false,
    isTemporary: true
  }
};
