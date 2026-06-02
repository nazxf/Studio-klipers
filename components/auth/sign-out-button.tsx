"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signOut({ redirectTo: "/" });
      }}
    >
      <LogOut aria-hidden="true" />
      <span className="hidden lg:inline">{isPending ? "Signing out" : "Logout"}</span>
    </Button>
  );
}
