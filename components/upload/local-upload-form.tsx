"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileVideo2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const MAX_CLIENT_UPLOAD_BYTES = 100 * 1024 * 1024;

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

function formatBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = sizeBytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(errorMessage);
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const isUploading = uploadState === "uploading";

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setProgress(0);
    setUploadState(file ? "ready" : "idle");
    setClientError(getClientFileError(file));
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

    setClientError(null);
    setUploadState("uploading");
    setProgress(1);

    request.upload.onprogress = (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        return;
      }

      const nextProgress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      setProgress(Math.max(1, Math.min(nextProgress, 99)));
    };

    request.onload = () => {
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
      setProgress(0);
      setUploadState("error");
      setClientError("The upload connection failed. Try again with a smaller MP4.");
    };

    request.open("POST", "/api/upload");
    request.setRequestHeader("Accept", "application/json");
    request.send(formData);
  }

  const fileLabel = selectedFile
    ? `${selectedFile.name} - ${formatBytes(selectedFile.size)}`
    : "Select one MP4 up to 100 MB";

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
            <label htmlFor="file" className="text-sm font-semibold text-foreground">
              MP4 file
            </label>
            <Input
              id="file"
              name="file"
              type="file"
              accept="video/mp4,.mp4"
              required
              disabled={isUploading}
              onChange={(event) => {
                handleFileChange(event.currentTarget.files?.[0] ?? null);
              }}
            />
          </div>

          <div className="rounded-md border border-border bg-secondary/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <FileVideo2 className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {fileLabel}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Stored under the controlled local uploads directory for this authenticated user.
                </p>
              </div>
            </div>
          </div>

          {isUploading || uploadState === "success" ? (
            <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  {uploadState === "success" ? (
                    <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="size-4 text-primary" aria-hidden="true" />
                  )}
                  {uploadState === "success" ? "Upload saved" : "Uploading locally"}
                </p>
                <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="mt-3" />
            </div>
          ) : null}

          {clientError ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 p-4">
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
            <Button type="submit" disabled={isUploading}>
              <UploadCloud aria-hidden="true" />
              {isUploading ? "Saving locally" : "Upload MP4"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
