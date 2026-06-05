import json
import logging
import sys


def read_payload():
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError as error:
        print(f"Invalid JSON input: {error}", file=sys.stderr)
        return None


def read_optional_string(payload, key, fallback=None):
    value = payload.get(key)

    if isinstance(value, str) and value.strip():
        return value.strip()

    return fallback


def read_required_string(payload, key):
    value = read_optional_string(payload, key)

    if not value:
        raise ValueError(f"Missing required string field: {key}")

    return value


def number_or_none(value):
    if isinstance(value, (int, float)):
        return float(value)

    return None


def word_to_json(word):
    return {
        "endSeconds": number_or_none(getattr(word, "end", None)),
        "probability": number_or_none(getattr(word, "probability", None)),
        "startSeconds": number_or_none(getattr(word, "start", None)),
        "word": str(getattr(word, "word", "")).strip(),
    }


def segment_to_json(segment):
    words = getattr(segment, "words", None)

    return {
        "confidence": None,
        "endSeconds": number_or_none(getattr(segment, "end", None)),
        "startSeconds": number_or_none(getattr(segment, "start", None)),
        "text": str(getattr(segment, "text", "")).strip(),
        "words": [word_to_json(word) for word in words] if words else None,
    }


def main():
    logging.basicConfig(stream=sys.stderr, level=logging.INFO)

    payload = read_payload()

    if payload is None:
        return 2

    try:
        from faster_whisper import WhisperModel
    except ModuleNotFoundError:
        print(
            "faster_whisper is not installed. Run python -m pip install -r requirements-transcription.txt",
            file=sys.stderr,
        )
        return 2

    try:
        media_path = read_required_string(payload, "mediaPath")
        model_name = read_optional_string(payload, "model", "base")
        device = read_optional_string(payload, "device", "cpu")
        compute_type = read_optional_string(payload, "computeType", "int8")
        language = read_optional_string(payload, "language")
        word_timestamps = bool(payload.get("wordTimestamps", True))

        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        segments, info = model.transcribe(
            media_path,
            language=language,
            word_timestamps=word_timestamps,
        )

        output = {
            "engine": "faster-whisper",
            "languageCode": getattr(info, "language", None),
            "languageProbability": number_or_none(
                getattr(info, "language_probability", None)
            ),
            "model": model_name,
            "segments": [segment_to_json(segment) for segment in segments],
        }

        json.dump(output, sys.stdout, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write("\n")
        sys.stdout.flush()
        return 0
    except Exception as error:
        print(f"Transcription failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
