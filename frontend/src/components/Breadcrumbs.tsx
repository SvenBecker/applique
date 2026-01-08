import { Link, useMatches } from "@tanstack/react-router";
import {
  Briefcase,
  FileText,
  Home,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route configuration with labels and icons
const routeConfig: Record<string, { label: string; icon: LucideIcon }> = {
  "/": { label: "Home", icon: Home },
  "/settings": { label: "Settings", icon: Settings },
  "/postings": { label: "Postings", icon: Briefcase },
  "/documents": { label: "Generate", icon: FileText },
  "/chat": { label: "AI Assistant", icon: MessageSquare },
};

export default function Breadcrumbs() {
  const matches = useMatches();

  // Get the current route path
  const currentPath = matches[matches.length - 1]?.pathname || "/";

  // Don't show breadcrumbs on home page
  if (currentPath === "/") {
    return null;
  }

  const config = routeConfig[currentPath];
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
