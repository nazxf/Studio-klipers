const DEFAULT_MAX_JSON_BODY_BYTES = 16 * 1024;

export class JsonBodyError extends Error {
  constructor(public code: "invalid_json" | "payload_too_large") {
    super(code);
  }
}

export async function readBoundedJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
) {
  if (!request.body) {
    throw new JsonBodyError("invalid_json");
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const declaredLength = Number(contentLength);

    if (!Number.isFinite(declaredLength) || declaredLength > maxBytes) {
      throw new JsonBodyError("payload_too_large");
    }
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new JsonBodyError("payload_too_large");
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof JsonBodyError) {
      throw error;
    }

    throw new JsonBodyError("invalid_json");
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new JsonBodyError("invalid_json");
  }
}
