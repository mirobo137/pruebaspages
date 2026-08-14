import hashlib
import os
from pathlib import Path
import tempfile
import unittest

import numpy as np
import librosa

from analyze_song import (
    ANALYZER_VERSION,
    SAMPLE_RATE,
    align_beats_to_offset,
    analyze_samples,
    normalize_robust,
    resolve_tempo,
    select_tracks,
    settings_hash,
)


class AnalysisTests(unittest.TestCase):
    def test_half_double_resolution_uses_hint_or_override(self):
        self.assertEqual(resolve_tempo(87, 174, None), (174, "tempo-hint"))
        self.assertEqual(resolve_tempo(174, 87, None), (87, "tempo-hint"))
        self.assertEqual(resolve_tempo(126, 128, 132), (132, "override"))

    def test_offset_preserves_detected_variation(self):
        beats = np.array([0.47, 0.98, 1.46, 1.99])
        shifted = align_beats_to_offset(beats, 0.5, 3)
        np.testing.assert_allclose(np.diff(shifted), np.diff(beats))
        self.assertAlmostEqual(shifted[0], 0.5)

    def test_constant_normalization_is_safe(self):
        np.testing.assert_array_equal(normalize_robust(np.ones(8)), np.zeros(8))

    def test_cache_key_changes_with_manual_rhythm_decisions(self):
        metadata = {"audioHash": "a" * 64, "rhythm": {"tempoHint": 120}}
        initial = settings_hash(metadata)
        metadata["rhythm"]["tempoHint"] = 174
        self.assertNotEqual(initial, settings_hash(metadata))

    def test_folder_mode_only_selects_registered_audio(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            audio_root = root / "public" / "assets" / "audio" / "selectas"
            audio_root.mkdir(parents=True)
            registered = audio_root / "registered.mp3"
            ignored = audio_root / "ignored.mp3"
            registered.touch()
            ignored.touch()
            metadata = [{
                "trackId": "registered",
                "webAudioPath": "./assets/audio/selectas/registered.mp3",
            }]
            selected = select_tracks(metadata, root, [], audio_root)
            self.assertEqual(selected[0][0], metadata[0])
            self.assertTrue(os.path.samefile(selected[0][1], registered))
            self.assertEqual(len(selected), 1)

    def test_synthetic_click_track_is_deterministic(self):
        bpm = 120
        duration = 12
        beat_times = np.arange(0.5, duration, 60 / bpm)
        samples = librosa.clicks(
            times=beat_times,
            sr=SAMPLE_RATE,
            length=SAMPLE_RATE * duration,
            click_freq=1_000,
            click_duration=0.05,
        ).astype(np.float32)
        audio_hash = hashlib.sha256(samples.tobytes()).hexdigest()
        options = dict(
            track_id="synthetic-click",
            audio_hash=audio_hash,
            tempo_hint=bpm,
            bpm_override=bpm,
            beat_offset_override=0.5,
        )
        first, first_diagnostics = analyze_samples(samples, SAMPLE_RATE, **options)
        second, second_diagnostics = analyze_samples(samples, SAMPLE_RATE, **options)
        self.assertEqual(first, second)
        self.assertEqual(first["analyzerVersion"], ANALYZER_VERSION)
        self.assertGreater(first["estimatedBpm"], 0)
        self.assertEqual(first["bpm"], bpm)
        self.assertEqual(first["tempoSource"], "override")
        self.assertEqual(first["beatOffset"], 0.5)
        self.assertEqual(first["beatOffsetSource"], "override")
        self.assertGreater(len(first["beats"]), 15)
        self.assertGreater(len(first["onsets"]), 15)
        self.assertEqual(first_diagnostics["rawBpm"], second_diagnostics["rawBpm"])


if __name__ == "__main__":
    unittest.main()
