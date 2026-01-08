import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { postingsApi, statusApi } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["status"],
    queryFn: statusApi.getStatus,
  });

  const { data: postings, refetch: refetchPostings } = useQuery({
    queryKey: ["postings"],
    queryFn: postingsApi.getPostings,
  });

  const recentPostings = postings?.slice(0, 5) || [];
  const hasProcessingPostings = postings?.some(
    (p) => p.extraction_status === "processing",
  );

  // Auto-refresh when extractions are in progress
  useEffect(() => {
    if (!hasProcessingPostings) return;

    const interval = setInterval(() => {
      refetch();
      refetchPostings();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [hasProcessingPostings, refetch, refetchPostings]);

  const totalPostings = status?.total_postings || 0;
  const completedPostings = status?.completed_postings || 0;
  const failedPostings = status?.failed_postings || 0;
  const pendingPostings = status?.pending_postings || 0;
  const processingPostings =
    postings?.filter((p) => p.extraction_status === "processing").length || 0;

  const successRate =
    totalPostings > 0
      ? Math.round((completedPostings / totalPostings) * 100)
      : 0;

  const completionProgress =
    totalPostings > 0
      ? Math.round(((completedPostings + failedPostings) / totalPostings) * 100)
      : 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Home</h1>

      {/* Color-coded Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Postings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {totalPostings}
            </div>
            {totalPostings > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {successRate}% success rate
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {completedPostings}
            </div>
            {totalPostings > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {Math.round((completedPostings / totalPostings) * 100)}% of
                total
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
              {pendingPostings}
            </div>
            {processingPostings > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse" />
                {processingPostings} processing now
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900 dark:text-red-100">
              {failedPostings}
            </div>
            {totalPostings > 0 && failedPostings > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {Math.round((failedPostings / totalPostings) * 100)}% failure
                rate
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar Section */}
      {totalPostings > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Extraction Progress</span>
              <span className="text-sm font-normal text-muted-foreground">
                {completedPostings + failedPostings} / {totalPostings} processed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={completionProgress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{completionProgress}% complete</span>
              {pendingPostings > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  {pendingPostings} remaining
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Active LLM Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Active LLM Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : status?.active_llm ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {status.active_llm.provider}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Model: {status.active_llm.model_name}
                </p>
                {status.active_llm.base_url && (
                  <p className="text-sm text-muted-foreground">
                    URL: {status.active_llm.base_url}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-muted-foreground">
                    No active LLM configured
                  </span>
                </div>
                <Link to="/settings">
                  <Button variant="outline" size="sm" className="mt-2">
                    Settings
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2">
              <Link to="/settings">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link to="/postings">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Job Postings
                </Button>
              </Link>
              <Link to="/documents">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate
                </Button>
              </Link>
              <Link to="/chat">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileText className="h-4 w-4" />
                  AI Assistant
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Job Postings */}
      {recentPostings.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Job Postings</span>
              <Link to="/postings">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPostings.map((posting) => (
                <button
                  type="button"
                  key={posting.id}
                  onClick={() =>
                    navigate({ to: "/postings", search: { id: posting.id } })
                  }
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {posting.generated_metadata?.company_name ??
                        "Processing..."}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {posting.generated_metadata?.job_title ??
                        "Extracting job details..."}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {posting.extraction_status === "completed" ? (
                      <>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Ready
                        </span>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </>
                    ) : posting.extraction_status === "processing" ? (
                      <>
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                          Processing
                        </span>
                        <Clock className="h-5 w-5 text-yellow-600 animate-pulse" />
                      </>
                    ) : posting.extraction_status === "failed" ? (
                      <>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Failed
                        </span>
                        <XCircle className="h-5 w-5 text-red-600" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500 font-medium">
                          Pending
                        </span>
                        <Clock className="h-5 w-5 text-gray-400" />
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Job Postings Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by adding your first job posting. The system will
                automatically extract key information using AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {!status?.active_llm ? (
                  <>
                    <Link to="/settings">
                      <Button className="gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Configure LLM First
                      </Button>
                    </Link>
                    <p className="text-xs text-muted-foreground self-center">
                      Required before adding postings
                    </p>
                  </>
                ) : (
                  <Link to="/postings">
                    <Button className="gap-2">
                      <Briefcase className="h-4 w-4" />
                      Add Your First Job Posting
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      {totalPostings === 0 && (
        <Alert>
          <AlertDescription>
            <strong>Welcome to Appliqué!</strong> Follow these steps to get
            started:
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Configure an LLM provider (OpenAI, Ollama, etc.)</li>
              <li>Add job posting URLs to extract metadata automatically</li>
              <li>Generate professional CVs and cover letters</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
