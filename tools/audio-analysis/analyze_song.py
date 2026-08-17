#!/usr/bin/env python3
"""Offline, deterministic musical evidence extractor for SUPERFLOW Analysis v1."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from typing import Any, Iterable

import librosa
import numpy as np


ANALYZER_VERSION = "librosa-m3-v1"
# Changes here invalidate local cache entries without changing the public
# Analysis v1 schema or rewriting already curated JSON files.
AUDIO_TOOLCHAIN_VERSION = "requirements-lock-2026-08-17"
SAMPLE_RATE = 22_050
HOP_LENGTH = 512
ENERGY_STEP_SECONDS = 0.25
AUDIO_SUFFIXES = {".mp3", ".ogg", ".wav", ".flac", ".m4a"}


def round_number(value: float) -> float:
    return round(float(value), 6)


def normalize_robust(values: np.ndarray) -> np.ndarray:
    values = np.nan_to_num(np.asarray(values, dtype=np.float64), copy=False)
    if values.size == 0:
        return values
    floor = float(np.percentile(values, 5))
    ceiling = float(np.percentile(values, 95))
    if ceiling <= floor + 1e-12:
        return np.zeros_like(values)
    return np.clip((values - floor) / (ceiling - floor), 0.0, 1.0)


def resolve_tempo(raw_bpm: float, tempo_hint: float | None, bpm_override: float | None) -> tuple[float, str]:
    if bpm_override is not None:
        return float(bpm_override), "override"
    candidates = sorted({
        candidate
        for candidate in (raw_bpm / 2, raw_bpm, raw_bpm * 2)
        if 30 <= candidate <= 300
    })
    if not candidates:
        raise ValueError(f"BPM estimado fuera de rango: {raw_bpm}")
    if tempo_hint is None:
        preferred = [candidate for candidate in candidates if 70 <= candidate <= 180]
        return min(preferred or candidates, key=lambda value: abs(value - raw_bpm)), "estimated"
    resolved = min(candidates, key=lambda value: abs(np.log2(value / tempo_hint)))
    return resolved, "tempo-hint"


def align_beats_to_offset(beats: np.ndarray, offset: float, duration: float) -> np.ndarray:
    if beats.size == 0:
        return beats
    anchor_index = int(np.argmin(np.abs(beats - offset)))
    shifted = beats + (offset - float(beats[anchor_index]))
    return shifted[(shifted >= 0) & (shifted <= duration)]


def band_energy(power: np.ndarray, frequencies: np.ndarray, low: float, high: float) -> np.ndarray:
    mask = (frequencies >= low) & (frequencies < high)
    if not np.any(mask):
        return np.zeros(power.shape[1], dtype=np.float64)
    return np.sqrt(np.mean(power[mask], axis=0))


def smooth(values: np.ndarray, seconds: float = 0.5) -> np.ndarray:
    window_size = max(1, int(round(seconds * SAMPLE_RATE / HOP_LENGTH)))
    kernel = np.ones(window_size, dtype=np.float64) / window_size
    return np.convolve(np.asarray(values, dtype=np.float64), kernel, mode="same")


def sample_frames(values: np.ndarray, frame_times: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    stride = max(1, int(round(ENERGY_STEP_SECONDS * SAMPLE_RATE / HOP_LENGTH)))
    return values[..., ::stride], frame_times[::stride]


def analyze_samples(
    samples: np.ndarray,
    sample_rate: int,
    *,
    track_id: str,
    audio_hash: str,
    tempo_hint: float | None = None,
    bpm_override: float | None = None,
    beat_offset_override: float | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if sample_rate != SAMPLE_RATE:
        samples = librosa.resample(samples, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
        sample_rate = SAMPLE_RATE
    samples = np.asarray(samples, dtype=np.float32)
    if samples.ndim != 1 or samples.size < sample_rate:
        raise ValueError("El audio debe ser mono y durar al menos un segundo.")
    duration = float(samples.size / sample_rate)

    onset_envelope = librosa.onset.onset_strength(
        y=samples,
        sr=sample_rate,
        hop_length=HOP_LENGTH,
        aggregate=np.median,
    )
    raw_tempo_values = librosa.feature.tempo(
        onset_envelope=onset_envelope,
        sr=sample_rate,
        hop_length=HOP_LENGTH,
        aggregate=np.median,
    )
    raw_bpm = float(np.atleast_1d(raw_tempo_values)[0])
    bpm, tempo_source = resolve_tempo(raw_bpm, tempo_hint, bpm_override)

    _, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_envelope,
        sr=sample_rate,
        hop_length=HOP_LENGTH,
        bpm=bpm,
        trim=False,
    )
    beats = librosa.frames_to_time(beat_frames, sr=sample_rate, hop_length=HOP_LENGTH)
    if beat_offset_override is not None:
        beats = align_beats_to_offset(beats, beat_offset_override, duration)
        beat_offset = float(beat_offset_override)
        offset_source = "override"
    else:
        beat_offset = float(beats[0]) if beats.size else 0.0
        offset_source = "estimated"

    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_envelope,
        sr=sample_rate,
        hop_length=HOP_LENGTH,
        backtrack=False,
        units="frames",
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sample_rate, hop_length=HOP_LENGTH)
    onset_strengths = normalize_robust(onset_envelope[onset_frames])

    stft = librosa.stft(samples, n_fft=2_048, hop_length=HOP_LENGTH, center=True)
    power = np.abs(stft) ** 2
    frequencies = librosa.fft_frequencies(sr=sample_rate, n_fft=2_048)
    frame_times = librosa.frames_to_time(
        np.arange(power.shape[1]), sr=sample_rate, hop_length=HOP_LENGTH,
    )
    volume = librosa.feature.rms(S=np.sqrt(power), frame_length=2_048)[0]
    low = band_energy(power, frequencies, 20, 250)
    mid = band_energy(power, frequencies, 250, 2_000)
    high = band_energy(power, frequencies, 2_000, min(10_000, sample_rate / 2 + 1))
    stacked, sampled_times = sample_frames(
        np.vstack([
            normalize_robust(smooth(volume)),
            normalize_robust(smooth(low)),
            normalize_robust(smooth(mid)),
            normalize_robust(smooth(high)),
        ]),
        frame_times,
    )
    valid = sampled_times <= duration
    sampled_times = sampled_times[valid]
    stacked = stacked[:, valid]

    analysis = {
        "schemaVersion": 1,
        "trackId": track_id,
        "audioHash": audio_hash,
        "analyzerVersion": ANALYZER_VERSION,
        "duration": round_number(duration),
        "estimatedBpm": round_number(raw_bpm),
        "bpm": round_number(bpm),
        "tempoSource": tempo_source,
        "beatOffset": round_number(beat_offset),
        "beatOffsetSource": offset_source,
        "beats": [round_number(value) for value in beats],
        "onsets": [
            {"time": round_number(time), "strength": round_number(strength)}
            for time, strength in zip(onset_times, onset_strengths, strict=True)
            if time <= duration
        ],
        "energyFrames": [
            {
                "time": round_number(sampled_times[index]),
                "volume": round_number(stacked[0, index]),
                "low": round_number(stacked[1, index]),
                "mid": round_number(stacked[2, index]),
                "high": round_number(stacked[3, index]),
            }
            for index in range(sampled_times.size)
        ],
    }
    diagnostics = {
        "rawBpm": round_number(raw_bpm),
        "tempoSource": tempo_source,
        "offsetSource": offset_source,
        "samples": samples,
        "onsetEnvelope": onset_envelope,
    }
    return analysis, diagnostics


def analyze_file(audio_path: Path, metadata: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    audio_bytes = audio_path.read_bytes()
    audio_hash = hashlib.sha256(audio_bytes).hexdigest()
    expected_hash = metadata.get("audioHash")
    if expected_hash and expected_hash != audio_hash:
        raise ValueError(f"Hash distinto para {metadata['trackId']}: metadata={expected_hash}, audio={audio_hash}")
    samples, sample_rate = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    rhythm = metadata.get("rhythm", {})
    return analyze_samples(
        samples,
        sample_rate,
        track_id=metadata["trackId"],
        audio_hash=audio_hash,
        tempo_hint=rhythm.get("tempoHint"),
        bpm_override=rhythm.get("bpmOverride"),
        beat_offset_override=rhythm.get("beatOffsetOverride"),
    )


def settings_hash(metadata: dict[str, Any]) -> str:
    relevant = {
        "analyzerVersion": ANALYZER_VERSION,
        "audioToolchainVersion": AUDIO_TOOLCHAIN_VERSION,
        "audioHash": metadata.get("audioHash"),
        "rhythm": metadata.get("rhythm", {}),
    }
    encoded = json.dumps(relevant, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def write_json_atomic(path: Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(encoded)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def render_debug(path: Path, analysis: dict[str, Any], diagnostics: dict[str, Any]) -> None:
    os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parent / ".matplotlib"))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    samples = diagnostics["samples"]
    waveform_times = np.arange(samples.size) / SAMPLE_RATE
    onsets = [entry["time"] for entry in analysis["onsets"]]
    energy = analysis["energyFrames"]
    figure, axes = plt.subplots(3, 1, figsize=(16, 9), sharex=True)
    axes[0].plot(waveform_times[::16], samples[::16], color="#55e7ff", linewidth=0.35)
    for beat in analysis["beats"]:
        axes[0].axvline(beat, color="#ffd75a", alpha=0.35, linewidth=0.6)
    axes[0].set_title(
        f"{analysis['trackId']} | BPM {analysis['bpm']} ({diagnostics['tempoSource']}) | "
        f"raw {diagnostics['rawBpm']}"
    )
    axes[0].set_ylabel("waveform")
    axes[1].plot(onsets, [entry["strength"] for entry in analysis["onsets"]], color="#ff5ad9")
    axes[1].set_ylabel("onsets")
    energy_times = [entry["time"] for entry in energy]
    for key, color in (("low", "#ffbd4a"), ("mid", "#65f0a7"), ("high", "#b88cff")):
        axes[2].plot(energy_times, [entry[key] for entry in energy], label=key, color=color)
    axes[2].set_ylabel("energia normalizada")
    axes[2].set_xlabel("segundos")
    axes[2].legend(loc="upper right")
    figure.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(path, dpi=120)
    plt.close(figure)


def load_metadata(metadata_directory: Path) -> list[dict[str, Any]]:
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(metadata_directory.glob("*.json"))]


def resolve_audio_path(project_root: Path, metadata: dict[str, Any]) -> Path:
    relative = metadata["webAudioPath"].removeprefix("./")
    return project_root / "public" / relative


def select_tracks(
    metadata_documents: list[dict[str, Any]],
    project_root: Path,
    track_ids: list[str],
    input_path: Path | None,
) -> list[tuple[dict[str, Any], Path]]:
    by_id = {metadata["trackId"]: metadata for metadata in metadata_documents}
    if track_ids:
        missing = sorted(set(track_ids) - by_id.keys())
        if missing:
            raise ValueError(f"Metadata inexistente para: {', '.join(missing)}")
        return [(by_id[track_id], resolve_audio_path(project_root, by_id[track_id])) for track_id in track_ids]
    if input_path is None:
        raise ValueError("Indica --track <id> o --input <archivo|carpeta>.")
    input_path = input_path.resolve()
    files = [input_path] if input_path.is_file() else [
        path for path in sorted(input_path.rglob("*")) if path.suffix.lower() in AUDIO_SUFFIXES
    ]
    metadata_by_audio = {
        resolve_audio_path(project_root, metadata).resolve(): metadata
        for metadata in metadata_documents
    }
    selected = []
    for audio_path in files:
        metadata = metadata_by_audio.get(audio_path.resolve())
        if metadata is None:
            print(f"- omitido sin metadata: {audio_path}")
            continue
        selected.append((metadata, audio_path))
    if not selected:
        raise ValueError("No se encontraron audios con metadata asociada.")
    return selected


def parse_args(arguments: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analiza audio offline para SUPERFLOW Analysis v1.")
    parser.add_argument("--track", action="append", default=[], help="trackId; se puede repetir")
    parser.add_argument("--input", type=Path, help="archivo o carpeta ya registrada en metadata")
    parser.add_argument("--force", action="store_true", help="ignora cache y regenera")
    parser.add_argument("--debug", action="store_true", help="genera PNG de waveform/beat/onsets/energia")
    parser.add_argument("--project-root", type=Path, help=argparse.SUPPRESS)
    return parser.parse_args(arguments)


def main(arguments: Iterable[str] | None = None) -> int:
    options = parse_args(arguments if arguments is not None else sys.argv[1:])
    project_root = (options.project_root or Path(__file__).resolve().parents[2]).resolve()
    metadata_directory = project_root / "content" / "music" / "metadata"
    output_directory = project_root / "content" / "music" / "analysis"
    cache_directory = Path(__file__).resolve().parent / ".cache"
    debug_directory = Path(__file__).resolve().parent / "debug"
    selected = select_tracks(load_metadata(metadata_directory), project_root, options.track, options.input)
    failures = []

    for metadata, audio_path in selected:
        track_id = metadata["trackId"]
        output_path = output_directory / f"{track_id}.json"
        cache_path = cache_directory / f"{track_id}-{settings_hash(metadata)}.json"
        try:
            if not audio_path.is_file():
                raise FileNotFoundError(f"Audio inexistente: {audio_path}")
            if cache_path.is_file() and not options.force:
                analysis = json.loads(cache_path.read_text(encoding="utf-8"))
                write_json_atomic(output_path, analysis)
                print(f"- cache: {track_id} | {analysis['bpm']} BPM | {len(analysis['beats'])} beats")
                if not options.debug:
                    continue
            analysis, diagnostics = analyze_file(audio_path, metadata)
            write_json_atomic(output_path, analysis)
            write_json_atomic(cache_path, analysis)
            if options.debug:
                render_debug(debug_directory / f"{track_id}.png", analysis, diagnostics)
            print(
                f"- analizado: {track_id} | {analysis['duration']} s | {analysis['bpm']} BPM "
                f"({diagnostics['tempoSource']}, raw {diagnostics['rawBpm']}) | "
                f"{len(analysis['beats'])} beats | {len(analysis['onsets'])} onsets"
            )
        except Exception as error:  # Keep other tracks and previous output intact.
            failures.append((track_id, error))
            print(f"! error {track_id}: {error}", file=sys.stderr)

    if failures:
        print(f"Analisis incompleto: {len(failures)} pista(s) fallaron.", file=sys.stderr)
        return 1
    print(f"Analysis v1 generado para {len(selected)} pista(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
