import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-3 text-foreground", className)}
      aria-label="Studio Klipers home"
    >
      <span className="relative flex size-9 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-secondary">
        <Image
          src="/brand-mark.png"
          alt=""
          fill
          sizes="36px"
          className="object-cover"
          priority
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5">Studio Klipers</span>
        <span className="block text-xs leading-4 text-muted-foreground">Creator clipper</span>
      </span>
    </Link>
  );
}
