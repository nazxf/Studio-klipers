import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="control-room flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <EmptyState
        icon={Compass}
        title="Page not available"
        description="This route is not available in the current MVP phase."
        action={
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        }
      />
    </main>
  );
}
