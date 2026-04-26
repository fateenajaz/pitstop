# Pit Stop Remotion Video

Vertical 2-minute mobile app video for Pit Stop.

## Specs

- Resolution: `1080x1920`
- FPS: `30`
- Duration: `120s`
- Output: `out/pitstop-mobile-demo.mp4`
- Audio: none
- Voiceover: script only in `VOICEOVER.md`

## Required Photo Assets

Save the attached brake photos here:

```text
video/public/assets/brake-obstructed.jpg
video/public/assets/brake-rotor-closeup.jpg
```

## Commands

Generate storyboard and voiceover with Claude:

```bash
cd video
npm run generate:storyboard
```

Preview:

```bash
cd video
npm run preview
```

Render final MP4:

```bash
cd video
npm run render
```

Render a faster half-scale preview:

```bash
cd video
npm run render:low
```
