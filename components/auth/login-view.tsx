"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  GitBranch,
  Globe2,
  Scissors,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";

const access: Array<{ icon: typeof UploadCloud; label: string }> = [
  { icon: UploadCloud, label: "Upload source MP4" },
  { icon: Scissors, label: "Trim a clean range" },
  { icon: Download, label: "Render & download" },
];

export function LoginView({
  authError,
  callbackUrl,
}: {
  authError: string | null;
  callbackUrl: string;
}) {
  return (
    <main className="control-room flex min-h-[100dvh] bg-background">
      {/* Brand panel */}
      <section className="surface-grid relative hidden w-[44%] border-r border-border bg-background/70 px-10 py-8 lg:flex lg:flex-col">
        <BrandMark />
        <div className="mt-auto max-w-md">
          <Badge variant="secondary">Access preview</Badge>
          <h1 className="text-balance mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground">
            Entry point for the creator control room.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Sign in with Google or GitHub to enter the protected clipping workspace.
          </p>
          <ul className="mt-8 space-y-3" aria-label="Inside the workspace">
            {access.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-card text-primary">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
          <div className="mt-10 h-px w-full signal-ruler opacity-80" aria-hidden="true" />
          <p className="mt-6 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Session-based access via Auth.js
          </p>
        </div>
      </section>

      {/* Auth panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandMark />
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                Home
              </Link>
            </Button>
          </div>

          <Card className="shadow-panel">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Choose a provider to continue into Studio Klipers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OAuthSignInButton
                provider="google"
                redirectTo={callbackUrl}
                icon={<Globe2 className="size-4" aria-hidden="true" />}
              >
                Continue with Google
              </OAuthSignInButton>
              <OAuthSignInButton
                provider="github"
                redirectTo={callbackUrl}
                icon={<GitBranch className="size-4" aria-hidden="true" />}
              >
                Continue with GitHub
              </OAuthSignInButton>

              <div className="flex items-center gap-3 pt-1" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Secure session
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex gap-3 rounded-md border border-border bg-secondary/55 p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Protected access</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Your session is stored with Auth.js and PostgreSQL before the dashboard opens.
                  </p>
                </div>
              </div>

              {authError ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/35 bg-destructive/10 p-4"
                >
                  <p className="text-sm font-semibold text-destructive">Login interrupted</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{authError}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="mt-6 hidden lg:block">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                Back to landing
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
