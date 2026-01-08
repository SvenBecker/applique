import {
  CheckCircle2,
  Clock,
  Loader2,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExtractionStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ExtractionStatus;
}

const statusConfig: Record<
  ExtractionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: LucideIcon;
  }
> = {
  [ExtractionStatus.PENDING]: {
    label: "Pending",
    variant: "secondary",
    icon: Clock,
  },
  [ExtractionStatus.PROCESSING]: {
    label: "Processing",
    variant: "default",
    icon: Loader2,
  },
  [ExtractionStatus.COMPLETED]: {
    label: "Completed",
    variant: "outline",
    icon: CheckCircle2,
  },
  [ExtractionStatus.FAILED]: {
    label: "Failed",
    variant: "destructive",
    icon: XCircle,
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon
        className={`h-3 w-3 ${status === ExtractionStatus.PROCESSING ? "animate-spin" : ""}`}
      />
      {config.label}
    </Badge>
  );
}
