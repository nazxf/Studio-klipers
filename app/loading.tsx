import { LoadingState } from "@/components/shared/loading-state";

export default function Loading() {
  return (
    <main className="control-room flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <LoadingState title="Loading workspace" description="Preparing the clipping shell." />
    </main>
  );
}
