import {
  MEDIA_TOOL_SETUP_GUIDANCE,
} from "../server/media-toolchain";
import { checkMediaToolchain } from "./media-tool-checks";

function formatSource(source: "env" | "path", envName: string) {
  return source === "env" ? envName : "PATH";
}

async function main() {
  const result = await checkMediaToolchain();

  console.log("Media toolchain preflight");

  for (const check of [result.ffmpeg, result.ffprobe]) {
    const envName = check.tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH";
    const source = formatSource(check.source, envName);

    if (check.isAvailable) {
      console.log(`OK ${check.tool}: Node can spawn it from ${source}.`);
      console.log(`Version: ${check.versionLine}`);
      continue;
    }

    console.error(`MISSING ${check.tool}: Node could not spawn it from ${source}.`);
    console.error(`Reason: ${check.errorMessage ?? "unknown error"}`);
  }

  if (!result.isReady) {
    console.error(MEDIA_TOOL_SETUP_GUIDANCE);
    process.exitCode = 1;
    return;
  }

  console.log("Media toolchain ready.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(MEDIA_TOOL_SETUP_GUIDANCE);
  process.exitCode = 1;
});
