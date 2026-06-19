"use client";

import type { DragEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileVideo2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const MAX_CLIENT_UPLOAD_BYTES = 100 * 1024 * 1024;

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

function getClientFileError(file: File | null) {
  if (!file) {
    return "Choose an MP4 file before uploading.";
  }

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_CLIENT_UPLOAD_BYTES) {
    return "Use an MP4 up to 100 MB for local development storage.";
  }

  if (!file.name.toLowerCase().endsWith(".mp4") || (file.type && file.type !== "video/mp4")) {
    return "Only MP4 files are supported in the local MVP.";
  }

  return null;
}

export function LocalUploadForm({ errorMessage }: { errorMessage: string | null }) {
  const router = useRouter();
  const activeRequestRef = useRef<XMLHttpRequest | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(errorMessage);
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const isUploading = uploadState === "uploading";

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
    };
  }, []);

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setProgress(0);
    setUploadState(file ? "ready" : "idle");
    setClientError(getClientFileError(file));
  }

  function assignFileToInput(file: File) {
    const input = fileInputRef.current;
    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
    handleFileChange(file);
  }

  function clearSelection() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleFileChange(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) {
      return;
    }
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      assignFileToInput(file);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const validationError = getClientFileError(selectedFile);

    if (validationError) {
      setClientError(validationError);
      setUploadState("error");
      setProgress(0);
      return;
    }

    const formData = new FormData(form);
    const request = new XMLHttpRequest();
    activeRequestRef.current?.abort();
    activeRequestRef.current = request;

    setClientError(null);
    setUploadState("uploading");
    setProgress(1);

    request.upload.onprogress = (progressEvent) => {
      if (!isMountedRef.current || activeRequestRef.current !== request) {
        return;
      }

      if (!progressEvent.lengthComputable) {
        return;
      }

      const nextProgress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      setProgress(Math.max(1, Math.min(nextProgress, 99)));
    };

    request.onload = () => {
      if (!isMountedRef.current || activeRequestRef.current !== request) {
        return;
      }

      activeRequestRef.current = null;
      let payload: { redirectUrl?: string; errorMessage?: string } = {};

      try {
        payload = JSON.parse(request.responseText) as typeof payload;
      } catch {
        payload = {};
      }

      if (request.status >= 200 && request.status < 300 && payload.redirectUrl) {
        setProgress(100);
        setUploadState("success");
        router.push(payload.redirectUrl);
        return;
      }

      setProgress(0);
      setUploadState("error");
      setClientError(payload.errorMessage ?? "The upload could not be saved locally. Try again.");
    };

    request.onerror = () => {
      if (!isMountedRef.current || activeRequestRef.current !== request) {
        return;
      }

      activeRequestRef.current = null;
      setProgress(0);
      setUploadState("error");
      setClientError("The upload connection failed. Try again with a smaller MP4.");
    };

    request.onabort = () => {
      if (!isMountedRef.current || activeRequestRef.current !== request) {
        return;
      }

      activeRequestRef.current = null;
      setProgress(0);
      setUploadState(selectedFile ? "ready" : "idle");
    };

    request.open("POST", "/api/upload");
    request.setRequestHeader("Accept", "application/json");
    request.send(formData);
  }

  return (
    <Card className="shadow-panel">
      <CardHeader>
        <CardTitle>Local MP4 intake</CardTitle>
        <CardDescription>
          Files are stored locally, scanned for duration, and served only through protected routes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action="/api/upload"
          method="post"
          encType="multipart/form-data"
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground">
              Video title
            </label>
            <Input
              id="title"
              name="title"
              placeholder="Optional title"
              autoComplete="off"
              maxLength={120}
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground">MP4 file</span>

            {/* Hidden native input drives the form submit; dropzone is the visible control. */}
            <input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept="video/mp4,.mp4"
              required
              disabled={isUploading}
              className="sr-only"
              aria-invalid={clientError ? true : undefined}
              aria-describedby={clientError ? "upload-error" : undefined}
              onChange={(event) => {
                handleFileChange(event.currentTarget.files?.[0] ?? null);
              }}
            />

            {selectedFile ? (
              <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                  <FileVideo2 className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
                {!isUploading ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove selected file"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                role="button"
                tabIndex={isUploading ? -1 : 0}
                aria-disabled={isUploading || undefined}
                aria-label="Upload MP4 file. Drag and drop, or activate to browse."
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (isUploading) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isUploading) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex min-h-[176px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/35 hover:border-primary/40 hover:bg-secondary/55",
                  isUploading && "pointer-events-none opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border transition-colors",
                    isDragging
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-primary/20 bg-primary/10 text-primary",
                  )}
                >
                  <UploadCloud className="size-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {isDragging ? "Drop to select" : "Drag & drop your MP4"}
                </span>
                <span className="text-sm text-muted-foreground">
                  or <span className="text-primary underline-offset-4">browse</span> — up to 100 MB
                </span>
              </div>
            )}
          </div>

          {isUploading || uploadState === "success" ? (
            <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  {uploadState === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <span className="truncate">
                    {uploadState === "success" ? "Upload saved" : "Uploading locally"}
                  </span>
                </p>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="mt-3" aria-label="Upload progress" />
            </div>
          ) : null}

          {clientError ? (
            <div
              id="upload-error"
              role="alert"
              className="rounded-md border border-destructive/35 bg-destructive/10 p-4"
            >
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertCircle className="size-4" aria-hidden="true" />
                Upload rejected
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{clientError}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              Local MVP storage, not public static hosting.
            </p>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              <UploadCloud aria-hidden="true" />
              {isUploading ? "Saving locally" : "Upload MP4"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
