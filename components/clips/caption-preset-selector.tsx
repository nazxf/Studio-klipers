"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClosedCaption, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CAPTION_PRESETS,
  type CaptionPresetKey,
  normalizeCaptionPresetKey,
} from "@/lib/caption-presets";
import { cn } from "@/lib/utils";

const PRESET_PREVIEW_CLASS_NAMES: Record<CaptionPresetKey, string> = {
  CREATOR_CLASSIC:
    "bg-background/86 text-foreground shadow-[0_10px_30px_rgb(0_0_0/0.35),0_0_0_1px_oklch(var(--foreground)/0.12)]",
  LIME_PUNCH:
    "border border-primary/25 bg-background text-primary shadow-[inset_0_-2px_0_oklch(var(--primary)/0.72)]",
  GAMING_BOLD:
    "border border-warning/35 bg-secondary text-foreground uppercase shadow-[3px_3px_0_oklch(var(--warning)/0.85)]",
  CLEAN_LOWER:
    "bg-background/70 text-muted-foreground shadow-[0_0_0_1px_oklch(var(--foreground)/0.1)]",
  CINEMATIC_POP:
    "border-y border-foreground/20 bg-background/88 text-foreground shadow-[0_12px_34px_rgb(0_0_0/0.42)]",
};

export function CaptionPresetSelector({
  activePresetKey,
  clipId,
}: {
  activePresetKey: CaptionPresetKey | string | null;
  clipId: string;
}) {
  const router = useRouter();
  const [selectedPresetKey, setSelectedPresetKey] = useState<CaptionPresetKey>(() =>
    normalizeCaptionPresetKey(activePresetKey),
  );
  const [savingPresetKey, setSavingPresetKey] = useState<CaptionPresetKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedPreset =
    CAPTION_PRESETS.find((preset) => preset.key === selectedPresetKey) ?? CAPTION_PRESETS[0];

  async function savePreset(presetKey: CaptionPresetKey) {
    if (presetKey === selectedPresetKey || savingPresetKey) {
      return;
    }

    setErrorMessage(null);
    setSavingPresetKey(presetKey);

    try {
      const response = await fetch(`/api/clips/${clipId}/subtitles/preset`, {
        body: JSON.stringify({
          presetKey,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload = (await response.json()) as {
        errorMessage?: string;
        track?: {
          presetKey?: unknown;
        };
      };

      if (!response.ok || !payload.track) {
        throw new Error(payload.errorMessage ?? "Caption preset could not be saved.");
      }

      setSelectedPresetKey(normalizeCaptionPresetKey(payload.track.presetKey));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Caption preset could not be saved.";

      setErrorMessage(message);
    } finally {
      setSavingPresetKey(null);
    }
  }

  return (
    <Card className="mt-6 shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>Caption style</CardTitle>
          <CardDescription>Browser preview preset for the active subtitle track.</CardDescription>
        </div>
        <Badge variant="outline">
          <ClosedCaption aria-hidden="true" />
          Preview only
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-5">
          {CAPTION_PRESETS.map((preset) => {
            const isSelected = preset.key === selectedPresetKey;
            const isSaving = preset.key === savingPresetKey;

            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  "group rounded-md border border-border bg-secondary/35 p-3 text-left transition-[background-color,border-color,transform] duration-150 hover:border-primary/35 hover:bg-secondary/60 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55",
                  isSelected && "border-primary/45 bg-primary/10",
                )}
                disabled={savingPresetKey !== null}
                onClick={() => savePreset(preset.key)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{preset.label}</span>
                  {isSaving ? (
                    <Loader2
                      className="size-3.5 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : isSelected ? (
                    <Check className="size-3.5 text-primary" aria-hidden="true" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-3 block truncate rounded-sm px-2 py-1.5 text-center text-xs font-bold leading-tight",
                    PRESET_PREVIEW_CLASS_NAMES[preset.key],
                  )}
                >
                  {preset.previewText}
                </span>
              </button>
            );
          })}
        </div>

        {errorMessage ? (
          <p className="mt-3 text-sm font-semibold text-destructive">{errorMessage}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selectedPresetKey === "CREATOR_CLASSIC" || savingPresetKey !== null}
            onClick={() => savePreset("CREATOR_CLASSIC")}
          >
            Reset preset
          </Button>
          <span className="text-xs text-muted-foreground">Selected: {selectedPreset.label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
