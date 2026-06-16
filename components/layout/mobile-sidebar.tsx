"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Gauge,
  LifeBuoy,
  Menu,
  Scissors,
  Settings,
  Upload,
  Video,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge, ready: true },
  { label: "Upload", href: "/upload", icon: Upload, ready: true, badge: "Local" },
  { label: "Videos", href: "/videos", icon: Video, ready: true },
  { label: "Clips", href: "/clips", icon: Scissors, ready: true },
  { label: "Settings", href: "/settings", icon: Settings, ready: false },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col px-4 py-5">
          <SheetHeader className="px-2">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <BrandMark />
          </SheetHeader>

          <div className="mt-7 px-2">
            <div className="signal-ruler h-px opacity-70" />
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Control deck
            </p>
          </div>

          <nav className="mt-4 space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (!item.ready) {
                return (
                  <div
                    key={item.label}
                    className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground/65"
                    aria-disabled="true"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      Soon
                    </Badge>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted/70 hover:text-foreground",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-border bg-card/88 p-4 shadow-panel-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <Clapperboard className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Local MVP storage
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Local MP4 intake
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LifeBuoy className="size-3.5" aria-hidden="true" />
              Files stream through protected API routes.
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
