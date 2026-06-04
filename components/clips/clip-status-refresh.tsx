"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ClipStatusRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshInterval = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => window.clearInterval(refreshInterval);
  }, [enabled, router]);

  return null;
}
