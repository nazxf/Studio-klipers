"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="control-room flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <ErrorState
        title="The interface could not load"
        description="Try refreshing the page. If it repeats, check the local app logs for the failing route."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
