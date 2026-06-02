"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, GitBranch, Globe2 } from "lucide-react";

import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeUp } from "@/lib/motion";

export function LoginView({
  authError,
  callbackUrl,
}: {
  authError: string | null;
  callbackUrl: string;
}) {
  return (
    <main className="control-room flex min-h-[100dvh] bg-background">
      <section className="hidden w-[42%] border-r border-border bg-background/72 px-10 py-8 lg:flex lg:flex-col">
        <BrandMark />
        <div className="mt-auto max-w-md">
          <Badge variant="secondary">Access preview</Badge>
          <h1 className="text-balance mt-5 text-4xl font-semibold tracking-tight text-foreground">
            Entry point for the creator control room.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Sign in with Google or GitHub to enter the protected clipping workspace.
          </p>
          <div className="mt-8 h-px w-full signal-ruler opacity-80" />
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="w-full max-w-md"
        >
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
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                Choose a provider to continue into Studio Klipers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OAuthSignInButton
                provider="google"
                redirectTo={callbackUrl}
                icon={<Globe2 aria-hidden="true" />}
              >
                Continue with Google
              </OAuthSignInButton>
              <OAuthSignInButton
                provider="github"
                redirectTo={callbackUrl}
                icon={<GitBranch aria-hidden="true" />}
              >
                Continue with GitHub
              </OAuthSignInButton>

              <div className="rounded-md border border-border bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-foreground">Protected access</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your account session is stored with Auth.js and PostgreSQL before the dashboard opens.
                </p>
              </div>

              {authError ? (
                <div className="rounded-md border border-destructive/35 bg-destructive/10 p-4">
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
