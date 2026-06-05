"use client";

import { useMemo, useState } from "react";

import {
  type CaptionPresetKey,
  normalizeCaptionPresetKey,
} from "@/lib/caption-presets";
import { cn } from "@/lib/utils";

type PreviewSegment = {
  endSeconds: number;
  id: string;
  startSeconds: number;
  text: string;
};

const CAPTION_PRESET_CLASS_NAMES: Record<
  CaptionPresetKey,
  {
    text: string;
    wrapper: string;
  }
> = {
  CREATOR_CLASSIC: {
    text: "max-w-[88%] rounded-md bg-background/86 px-4 py-2 text-center text-lg font-bold leading-snug text-foreground shadow-[0_10px_34px_rgb(0_0_0/0.45),0_0_0_1px_oklch(var(--foreground)/0.12)]",
    wrapper: "inset-x-4 bottom-[10%] justify-center",
  },
  LIME_PUNCH: {
    text: "max-w-[90%] rounded-md border border-primary/25 bg-background/92 px-4 py-2 text-center text-xl font-black leading-tight text-primary shadow-[0_12px_34px_rgb(0_0_0/0.52),inset_0_-3px_0_oklch(var(--primary)/0.72)]",
    wrapper: "inset-x-4 bottom-[9%] justify-center",
  },
  GAMING_BOLD: {
    text: "max-w-[90%] rounded-sm border border-warning/35 bg-secondary/95 px-4 py-2 text-center text-xl font-black uppercase leading-tight text-foreground shadow-[4px_4px_0_oklch(var(--warning)/0.78),0_14px_32px_rgb(0_0_0/0.55)]",
    wrapper: "inset-x-4 bottom-[9%] justify-center",
  },
  CLEAN_LOWER: {
    text: "max-w-[82%] rounded-sm bg-background/74 px-3 py-1.5 text-center text-base font-semibold leading-snug text-foreground shadow-[0_8px_24px_rgb(0_0_0/0.38),0_0_0_1px_oklch(var(--foreground)/0.1)]",
    wrapper: "inset-x-4 bottom-[8%] justify-center",
  },
  CINEMATIC_POP: {
    text: "w-[min(86%,46rem)] border-y border-foreground/20 bg-background/88 px-5 py-2.5 text-center text-lg font-bold leading-snug text-foreground shadow-[0_14px_38px_rgb(0_0_0/0.54)]",
    wrapper: "inset-x-0 bottom-[11%] justify-center",
  },
};

export function ClipSubtitlePreview({
  presetKey,
  segments,
  videoSrc,
}: {
  presetKey: CaptionPresetKey | string | null;
  segments: PreviewSegment[];
  videoSrc: string;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const normalizedPresetKey = normalizeCaptionPresetKey(presetKey);
  const presetClassNames = CAPTION_PRESET_CLASS_NAMES[normalizedPresetKey];
  const activeSegment = useMemo(
    () =>
      segments.find(
        (segment) => segment.startSeconds <= currentTime && currentTime < segment.endSeconds,
      ) ?? null,
    [currentTime, segments],
  );

  return (
    <div className="relative bg-black">
      <video
        src={videoSrc}
        controls
        preload="metadata"
        className="aspect-video w-full bg-black"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      {activeSegment ? (
        <div
          className={cn(
            "pointer-events-none absolute flex",
            presetClassNames.wrapper,
          )}
        >
          <p className={presetClassNames.text}>{activeSegment.text}</p>
        </div>
      ) : null}
    </div>
  );
}
