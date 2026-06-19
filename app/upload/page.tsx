import { Clock3, FileVideo2, ShieldCheck } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnimatedPage } from "@/components/motion/animated-page";
import { PageHeader } from "@/components/shared/page-header";
import { LocalUploadForm } from "@/components/upload/local-upload-form";
import { requireCurrentUser } from "@/server/current-user";
import { getUploadErrorMessage } from "@/server/upload";

const intakeSteps: Array<{ icon: typeof FileVideo2; title: string; description: string }> = [
  {
    icon: FileVideo2,
    title: "Validate the file",
    description: "MP4 only, up to 100 MB, checked before anything is written.",
  },
  {
    icon: Clock3,
    title: "Detect duration",
    description: "ffprobe reads the length so the clipper knows the full range.",
  },
  {
    icon: ShieldCheck,
    title: "Store securely",
    description: "Saved under your user scope and streamed only through protected routes.",
  },
];

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
      <AnimatedPage>
        <PageHeader
          eyebrow="Local storage"
          title="Upload MP4"
          description="Save an MP4 locally, detect its duration with ffprobe, and register metadata in PostgreSQL."
        />

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.4fr]">
          <LocalUploadForm errorMessage={errorMessage} />

          <aside className="space-y-4">
            <div className="panel-edge rounded-lg border border-border bg-card p-5 shadow-panel-sm">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                How intake works
              </p>
              <ol className="mt-4 space-y-4">
                {intakeSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                      <step.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        <span className="font-mono text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>{" "}
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-border bg-secondary/35 p-5">
              <p className="text-sm font-semibold text-foreground">Storage key</p>
              <p className="mt-2 break-all font-mono text-[11px] leading-5 text-muted-foreground">
                users/&#123;userId&#125;/videos/&#123;videoId&#125;/original.mp4
              </p>
            </div>
          </aside>
        </section>
      </AnimatedPage>
    </DashboardShell>
  );
}
