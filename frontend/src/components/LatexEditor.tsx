import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileEdit, Loader2, Save, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { LatexHighlightedTextarea } from "@/components/LatexHighlightedTextarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { documentsApi } from "@/lib/api";

interface LatexEditorProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  content: string;
  fileType: "cv" | "cover_letter" | "personal_information";
  onSave: (content: string, newFilename?: string) => Promise<void>;
}

export function LatexEditor({
  isOpen,
  onClose,
  filename,
  content,
  fileType,
  onSave,
}: LatexEditorProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [customFilename, setCustomFilename] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{
    content: string;
    filename?: string;
  } | null>(null);

  // Fetch existing files for overwrite detection
  const { data: existingFiles = [] } = useQuery({
    queryKey: ["document-files", fileType],
    queryFn: () => documentsApi.listFiles(fileType),
    enabled: isOpen,
  });

  useEffect(() => {
    setEditedContent(content);
    const lines = content.split("\n").length;
    setLineCount(lines);
    setCustomFilename(""); // Reset custom filename when content changes
  }, [content]);

  useEffect(() => {
    const lines = editedContent.split("\n").length;
    setLineCount(lines);
  }, [editedContent]);

  const hasChanges = editedContent !== content;

  const getTargetFilename = useCallback(() => {
    if (customFilename.trim()) {
      const extension = fileType === "personal_information" ? ".txt" : ".tex";
      return customFilename.trim().endsWith(extension)
        ? customFilename.trim()
        : `${customFilename.trim()}${extension}`;
    }
    return filename;
  }, [customFilename, filename, fileType]);

  const performSave = useCallback(
    async (content: string, newFilename?: string) => {
      setIsSaving(true);
      try {
        await onSave(content, newFilename);
        toast.success("File saved successfully");
        onClose();
      } catch (error) {
        const err = error as Error;
        toast.error(err.message || "Failed to save file");
      } finally {
        setIsSaving(false);
      }
    },
    [onSave, onClose],
  );

  const handleSave = useCallback(async () => {
    const targetFilename = getTargetFilename();
    const willOverwrite = existingFiles.includes(targetFilename);

    if (willOverwrite) {
      // Show confirmation dialog
      setPendingSaveData({
        content: editedContent,
        filename: customFilename || undefined,
      });
      setShowOverwriteDialog(true);
      return;
    }

    await performSave(editedContent, customFilename || undefined);
  }, [
    editedContent,
    customFilename,
    existingFiles,
    getTargetFilename,
    performSave,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
      // Escape to close
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isSaving, hasChanges, onClose, handleSave]);

  const handleConfirmOverwrite = useCallback(async () => {
    if (pendingSaveData) {
      setShowOverwriteDialog(false);
      await performSave(pendingSaveData.content, pendingSaveData.filename);
      setPendingSaveData(null);
    }
  }, [pendingSaveData, performSave]);

  const handleCancelOverwrite = useCallback(() => {
    setShowOverwriteDialog(false);
    setPendingSaveData(null);
  }, []);

  const editorLabel =
    fileType === "personal_information"
      ? "Personal Information"
      : "LaTeX Document";

  const targetFilename = getTargetFilename();
  const willOverwrite = existingFiles.includes(targetFilename);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Edit {editorLabel}
            </DialogTitle>
            <DialogDescription>
              Edit your{" "}
              {fileType === "cv"
                ? "CV"
                : fileType === "cover_letter"
                  ? "Cover Letter"
                  : "Personal Information"}
              . Changes will be saved to a new file.
              <span className="block mt-1 text-xs">
                💡 Tip: Use Cmd/Ctrl+S to save, Esc to close
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Filename Input */}
            <div className="space-y-2">
              <Label htmlFor="filename">Save As (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="filename"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder={`Leave empty to overwrite: ${filename}`}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">
                  {fileType === "personal_information" ? ".txt" : ".tex"}
                </span>
              </div>
              <div className="flex items-start gap-2">
                {willOverwrite && (
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                )}
                <p
                  className={`text-xs ${willOverwrite ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}
                >
                  {customFilename
                    ? willOverwrite
                      ? `⚠️ Will overwrite existing file: ${targetFilename}`
                      : `Will save as: ${targetFilename}`
                    : `Will overwrite: ${targetFilename}`}
                </p>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden min-h-0">
              <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{filename}</span>
                  <span>•</span>
                  <span>{lineCount} lines</span>
                  {hasChanges && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600 dark:text-orange-400">
                        Modified
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {fileType === "personal_information" ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full font-mono text-sm resize-none border focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
                    style={{
                      minHeight: "100%",
                      lineHeight: "1.5",
                      tabSize: 2,
                    }}
                    spellCheck={false}
                  />
                ) : (
                  <LatexHighlightedTextarea
                    value={editedContent}
                    onChange={setEditedContent}
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog
        open={showOverwriteDialog}
        onOpenChange={setShowOverwriteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Overwrite Existing File?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The file{" "}
              <span className="font-semibold text-foreground">
                {targetFilename}
              </span>{" "}
              already exists. Are you sure you want to overwrite it? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOverwrite}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              Overwrite File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
