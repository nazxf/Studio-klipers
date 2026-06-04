import { HardDrive, ShieldCheck } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { LocalUploadForm } from "@/components/upload/local-upload-form";
import { Badge } from "@/components/ui/badge";
import { requireCurrentUser } from "@/server/current-user";
import { getUploadErrorMessage } from "@/server/upload";

export default async function UploadPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const [user, params] = await Promise.all([requireCurrentUser("/upload"), searchParams]);
  const errorMessage = getUploadErrorMessage(params?.error);

  return (
    <DashboardShell user={user}>
      <PageHeader
        eyebrow="Local storage"
        title="Upload MP4"
        description="Save an MP4 locally, detect its duration with ffprobe, and register metadata in PostgreSQL."
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <HardDrive aria-hidden="true" />
          Local development
        </Badge>
        <Badge variant="outline">
          <ShieldCheck aria-hidden="true" />
          Protected stream
        </Badge>
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.78fr_0.22fr]">
        <LocalUploadForm errorMessage={errorMessage} />
        <div className="panel-edge rounded-lg border border-border bg-card/88 p-5 shadow-panel-sm">
          <p className="text-sm font-semibold text-foreground">Storage key</p>
          <p className="mt-2 font-mono text-[11px] leading-5 text-muted-foreground">
            users/&#123;userId&#125;/videos/&#123;videoId&#125;/original.mp4
          </p>
          <div className="mt-5 h-px signal-ruler opacity-70" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            The file is streamed through an authenticated route, never from a public folder.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
