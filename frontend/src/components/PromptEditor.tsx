import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Code, Eye, Info, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HighlightedTextarea } from "@/components/HighlightedTextarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { promptsApi } from "@/lib/api";

interface PromptEditorProps {
  templateName: string;
  isOpen: boolean;
  onClose: () => void;
  previewContext?: Record<string, unknown>;
  height?: string; // Allow customizable height
}

export function PromptEditor({
  templateName,
  isOpen,
  onClose,
  previewContext = {},
  height = "h-[85vh]", // Default to 85vh
}: PromptEditorProps) {
  const queryClient = useQueryClient();
  const [editedContent, setEditedContent] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "help">(
    "edit",
  );

  // Fetch prompt details
  const { data: prompt, isLoading } = useQuery({
    queryKey: ["prompt", templateName],
    queryFn: () => promptsApi.getPrompt(templateName),
    enabled: isOpen,
  });

  // Update edited content when prompt loads
  useEffect(() => {
    if (prompt?.content) {
      setEditedContent(prompt.content);
    }
  }, [prompt?.content]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => promptsApi.previewPrompt(templateName, previewContext),
    onError: (error: Error) => {
      toast.error(`Preview failed: ${error.message}`);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      promptsApi.savePrompt(templateName, content),
    onSuccess: () => {
      toast.success("Prompt saved successfully");
      queryClient.invalidateQueries({ queryKey: ["prompt", templateName] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () => promptsApi.resetPrompt(templateName),
    onSuccess: () => {
      toast.success("Prompt reset to default");
      queryClient.invalidateQueries({ queryKey: ["prompt", templateName] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(editedContent);
  };

  const handleReset = () => {
    if (confirm("Reset prompt to default? Your customizations will be lost.")) {
      resetMutation.mutate();
    }
  };

  const handlePreview = () => {
    previewMutation.mutate();
    setActiveTab("preview");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl ${height} overflow-hidden flex flex-col`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {prompt?.display_name || "Loading..."}
                {prompt?.is_customized && (
                  <Badge variant="secondary">Customized</Badge>
                )}
              </DialogTitle>
              <DialogDescription>{prompt?.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">
              <Code className="h-4 w-4 mr-2" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="help">
              <Info className="h-4 w-4 mr-2" />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="edit"
            className="flex-1 flex flex-col overflow-hidden mt-4 space-y-4 min-h-0"
          >
            <div className="flex-1 flex flex-col space-y-2 min-h-0">
              <Label>Template Content</Label>
              <HighlightedTextarea
                value={editedContent}
                onChange={setEditedContent}
                placeholder="Loading..."
                disabled={isLoading}
              />
            </div>

            {prompt?.variables && prompt.variables.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Available variables:</strong>{" "}
                  {prompt.variables.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="border rounded-md p-4 bg-muted/50 min-h-[400px]">
              {previewMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : previewMutation.data ? (
                <pre className="text-sm whitespace-pre-wrap">
                  {previewMutation.data.rendered}
                </pre>
              ) : (
                <p className="text-muted-foreground text-center">
                  Click "Preview" to render the template
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="help" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Jinja2 Syntax</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Variables: <code>{"{{ variable_name }}"}</code>
                  </li>
                  <li>
                    Conditionals:{" "}
                    <code>{"{% if condition %} ... {% endif %}"}</code>
                  </li>
                  <li>
                    Loops:{" "}
                    <code>{"{% for item in items %} ... {% endfor %}"}</code>
                  </li>
                  <li>
                    Comments: <code>{"{# comment #}"}</code>
                  </li>
                  <li>
                    Default values: <code>{"{{ var or 'default' }}"}</code>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Template Inheritance</h3>
                <p className="text-muted-foreground mb-2">
                  Use <code>{"{% extends 'template_name.jinja' %}"}</code> to
                  inherit from defaults.
                </p>
                <pre className="bg-muted p-2 rounded text-xs">
                  {`{% extends "chat_instructions.txt.jinja" %}

{% block base_instructions %}
Your custom instructions here
{% endblock %}`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Tips</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Use template inheritance to minimize changes</li>
                  <li>Test with preview before saving</li>
                  <li>Check available variables in the Edit tab</li>
                  <li>Reset to default if something breaks</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            {prompt?.is_customized && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={resetMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !editedContent.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
