import { CheckCircle2, Circle, Scissors, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "Upload source",
    description: "Store the original MP4 in the workspace.",
    icon: CheckCircle2,
    state: "Ready",
  },
  {
    title: "Choose range",
    description: "Set start and end time for a focused clip.",
    icon: Timer,
    state: "Ready",
  },
  {
    title: "Create clip",
    description: "Create pending jobs now; FFmpeg processing waits for Phase 6.",
    icon: Scissors,
    state: "Pending",
  },
];

export function WorkflowCard() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Clip workflow</CardTitle>
        <CardDescription>Operational steps from source file to final cut.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                {index < steps.length - 1 ? (
                  <div className="mt-2 h-8 w-px bg-border" aria-hidden="true" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <Badge variant={index === 0 ? "default" : "secondary"}>{step.state}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
        <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Circle className="mt-0.5 size-4 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">
            Phase 5 queues pending clip jobs. Actual cutting remains reserved for the Phase 6 worker.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
