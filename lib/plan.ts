import { Cpu, Briefcase, Rocket, Zap } from "lucide-react";

export const PLAN_META = {
  sandbox: {
    label: "SandBox Level",
    icon: Cpu,
    color: "text-purple-600",
    bg: "bg-purple-100"
  },
  clientProject: {
    label: "Client Project GPTs",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-100"
  },
  pro: {
    label: "Pro",
    icon: Rocket,
    color: "text-green-600",
    bg: "bg-green-100"
  },
  basic: {
    label: "Basic",
    icon: Zap,
    color: "text-yellow-600",
    bg: "bg-yellow-100"
  }
};

export function getPlanMeta(plan: string = "basic") {
  return PLAN_META[plan as keyof typeof PLAN_META] ?? PLAN_META.basic;
}
