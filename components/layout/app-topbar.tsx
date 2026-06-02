import type { Session } from "next-auth";
import Link from "next/link";
import { Bell, Command, Search, Upload } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "Studio Klipers";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getSafeAvatarUrl(image?: string | null) {
  if (!image) {
    return null;
  }

  try {
    const url = new URL(image);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function AppTopbar({ user }: { user: Session["user"] }) {
  const displayName = user.name || user.email || "Creator";
  const safeAvatarUrl = getSafeAvatarUrl(user.image);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/88 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <BrandMark className="md:hidden" />

        <div className="hidden w-full max-w-md items-center md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search videos and clips"
              placeholder="Search videos and clips"
              className="h-9 border-border/80 bg-card/78 pl-9 pr-16"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 flex h-5 -translate-y-1/2 items-center gap-1 rounded border border-border bg-secondary px-1.5 text-[10px] text-muted-foreground">
              <Command className="size-3" aria-hidden="true" />K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Signed in
          </Badge>
          <Button variant="secondary" size="icon" aria-label="Notifications">
            <Bell aria-hidden="true" />
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/upload">
              <Upload aria-hidden="true" />
              Upload
            </Link>
          </Button>
          <div className="ml-1 flex min-w-0 items-center gap-2 rounded-md border border-border bg-card/88 p-1 pr-2 shadow-panel-sm">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 bg-cover bg-center font-mono text-[11px] font-semibold text-primary"
              style={safeAvatarUrl ? { backgroundImage: `url(${safeAvatarUrl})` } : undefined}
              aria-hidden="true"
            >
              {safeAvatarUrl ? null : getInitials(user.name, user.email)}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-32 truncate text-xs font-semibold leading-4 text-foreground">
                {displayName}
              </p>
              <p className="max-w-32 truncate font-mono text-[10px] leading-3 text-muted-foreground">
                Creator
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
