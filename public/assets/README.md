# Game assets

## Audio

Place production music according to its unlock price. The build scans all four locations and generates `music-manifest.json` plus any missing initial beatmaps.

Recommended first filename:

```text
public/assets/audio/my-song.mp3             Free
public/assets/audio/economicas/my-song.mp3  400 coins
public/assets/audio/selectas/my-song.mp3    800 coins
public/assets/audio/premium/my-song.mp3     1,400 coins
```

Use an original track or audio with a license that permits web distribution. Keep the editable project and uncompressed source files outside the web bundle. The game should load compressed files such as MP3 or OGG.

## Beatmaps

Place beat maps in `public/assets/beatmaps/`. The expected name is generated from the audio filename. For example, `my-song.mp3` will use:

```text
public/assets/beatmaps/my-song.json
```

A beat map describes the exact timeline of gameplay events and will be separate from the audio analysis used for visual effects.

The current prototype supports tap and drag events. Each event may include normalized start and end positions from 0 to 1. For drag events, start is the initial circle and end is the destination shown by the trail.
