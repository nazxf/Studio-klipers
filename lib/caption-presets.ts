export const CAPTION_PRESET_KEYS = [
  "CREATOR_CLASSIC",
  "LIME_PUNCH",
  "GAMING_BOLD",
  "CLEAN_LOWER",
  "CINEMATIC_POP",
] as const;

export type CaptionPresetKey = (typeof CAPTION_PRESET_KEYS)[number];

export const DEFAULT_CAPTION_PRESET_KEY: CaptionPresetKey = "CREATOR_CLASSIC";

export type CaptionPresetStyleSnapshot = {
  accent: "none" | "lime" | "amber" | "silver";
  casing: "normal" | "uppercase";
  container: "pill" | "plate" | "minimal" | "strip";
  key: CaptionPresetKey;
  scale: "compact" | "standard" | "large";
  tone: "classic" | "punch" | "gaming" | "clean" | "cinematic";
  version: 1;
  weight: "semibold" | "bold" | "black";
};

type CaptionPreset = {
  description: string;
  key: CaptionPresetKey;
  label: string;
  previewText: string;
  style: CaptionPresetStyleSnapshot;
};

export const CAPTION_PRESETS = [
  {
    description: "Bold creator subtitle with a compact dark backing.",
    key: "CREATOR_CLASSIC",
    label: "Creator Classic",
    previewText: "Clean hook energy",
    style: {
      accent: "none",
      casing: "normal",
      container: "pill",
      key: "CREATOR_CLASSIC",
      scale: "standard",
      tone: "classic",
      version: 1,
      weight: "bold",
    },
  },
  {
    description: "Lime-forward creator caption with extra snap.",
    key: "LIME_PUNCH",
    label: "Lime Punch",
    previewText: "Watch this moment",
    style: {
      accent: "lime",
      casing: "normal",
      container: "plate",
      key: "LIME_PUNCH",
      scale: "large",
      tone: "punch",
      version: 1,
      weight: "black",
    },
  },
  {
    description: "Heavy uppercase caption for loud gaming clips.",
    key: "GAMING_BOLD",
    label: "Gaming Bold",
    previewText: "CLUTCH PLAY",
    style: {
      accent: "amber",
      casing: "uppercase",
      container: "plate",
      key: "GAMING_BOLD",
      scale: "large",
      tone: "gaming",
      version: 1,
      weight: "black",
    },
  },
  {
    description: "Low-profile lower-third subtitle for cleaner edits.",
    key: "CLEAN_LOWER",
    label: "Clean Lower",
    previewText: "Simple and readable",
    style: {
      accent: "none",
      casing: "normal",
      container: "minimal",
      key: "CLEAN_LOWER",
      scale: "compact",
      tone: "clean",
      version: 1,
      weight: "semibold",
    },
  },
  {
    description: "Wide cinematic strip with polished contrast.",
    key: "CINEMATIC_POP",
    label: "Cinematic Pop",
    previewText: "Frame the line",
    style: {
      accent: "silver",
      casing: "normal",
      container: "strip",
      key: "CINEMATIC_POP",
      scale: "standard",
      tone: "cinematic",
      version: 1,
      weight: "bold",
    },
  },
] as const satisfies readonly CaptionPreset[];

const CAPTION_PRESET_KEY_SET = new Set<string>(CAPTION_PRESET_KEYS);

export function isCaptionPresetKey(value: unknown): value is CaptionPresetKey {
  return typeof value === "string" && CAPTION_PRESET_KEY_SET.has(value);
}

export function normalizeCaptionPresetKey(value: unknown): CaptionPresetKey {
  return isCaptionPresetKey(value) ? value : DEFAULT_CAPTION_PRESET_KEY;
}

export function getCaptionPreset(value: unknown) {
  const key = normalizeCaptionPresetKey(value);

  return CAPTION_PRESETS.find((preset) => preset.key === key) ?? CAPTION_PRESETS[0];
}

export function getCaptionPresetStyleSnapshot(value: unknown) {
  const style = getCaptionPreset(value).style;

  return {
    ...style,
  };
}
