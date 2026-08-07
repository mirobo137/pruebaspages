# Game assets

## Audio

Place production music in `public/assets/audio/`. The build automatically scans this folder and generates `music-manifest.json`.

Recommended first filename:

```text
public/assets/audio/my-song.mp3
```

Use an original track or audio with a license that permits web distribution. Keep the editable project and uncompressed source files outside the web bundle. The game should load compressed files such as MP3 or OGG.

## Beatmaps

Place beat maps in `public/assets/beatmaps/`. The expected name is generated from the audio filename. For example, `my-song.mp3` will use:

```text
public/assets/beatmaps/my-song.json
```

A beat map describes the exact timeline of gameplay events and will be separate from the audio analysis used for visual effects.
