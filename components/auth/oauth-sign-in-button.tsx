"use client";

import { useState, type ReactNode } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type OAuthProvider = "google" | "github";

export function OAuthSignInButton({
  children,
  icon,
  provider,
  redirectTo,
}: {
  children: ReactNode;
  icon: ReactNode;
  provider: OAuthProvider;
  redirectTo: string;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      className="h-11 w-full justify-start gap-3"
      variant="secondary"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        setIsPending(true);
        void signIn(provider, { redirectTo });
      }}
    >
      <span className="flex size-5 items-center justify-center text-foreground" aria-hidden="true">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      {isPending ? "Opening provider…" : children}
    </Button>
  );
}
