"use client";

import { useState, type ReactNode } from "react";
import { signIn } from "next-auth/react";

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
      className="w-full justify-start"
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signIn(provider, { redirectTo });
      }}
    >
      {icon}
      {isPending ? "Opening provider..." : children}
    </Button>
  );
}
