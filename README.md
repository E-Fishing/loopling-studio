# Loopling Studio

A free music maker that teaches you how music software works, one small step at a time.

Apps like FL Studio, GarageBand and Ableton are called DAWs (Digital Audio Workstations). They're how most music gets made today, but they're expensive and overwhelming for beginners. Loopling Studio is a DAW that runs in any web browser, including school Chromebooks, and teaches you as you go. Woofer, a little talking speaker, guides you through 9 short hands-on lessons:

1. Welcome to the studio: play, stop, tempo and the metronome
2. Your first beat: a step sequencer
3. Notes and the piano roll
4. Chords
5. Music theory: why chords work
6. Melody and recording
7. Mixing
8. Patterns and arranging
9. Save and share

Tools stay locked until you learn them, so the screen never gets overwhelming. The Dictionary shows what each tool is called in FL Studio, GarageBand and Ableton, and every lesson ends with a short "try it in a real DAW" task for GarageBand or BandLab. After the lessons, everything unlocks and Loopling becomes a full studio with real recorded instruments, from grand piano to strings, brass and woodwinds.

## Try it

**[Open Loopling Studio](https://LIVE-LINK-GOES-HERE)**

## Run it on your own computer

Loopling is plain HTML and JavaScript with no install step. Browsers don't let a page load sound files straight from your disk, so serve the folder with any small web server, for example:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## How the code is organized

| File | What it does |
|---|---|
| `src/01-head.html` | Page styles |
| `src/02-body.html` | Page layout: transport, track rack, editor |
| `src/10-core.js` | Music theory, instruments, the song data, undo |
| `src/20-audio.js` | Sound engine: scheduling notes on time, synthesizers, drums, recording, export to WAV |
| `src/22-samples.js` | Loading and playing the real instrument recordings, credits |
| `src/30-ui.js` | Track rack, mixer, arrange view |
| `src/40-editors.js` | Step sequencer, piano roll, chord helper, computer-keyboard piano, keybind settings |
| `src/50-lessons.js` | Every lesson step: what Woofer says and what it checks |
| `src/55-guide.js` | Woofer: moving around, the speech bubble, lesson flow, the Dictionary |
| `src/56-voice.js` | Playing Woofer's recorded voice lines |
| `src/60-main.js` | Buttons, keyboard shortcuts, saving and opening projects, startup |

`build.sh` joins these into `index.html` (and `loopling-studio.html`, the same app without the page skeleton). Run `sh build.sh` after changing anything in `src/`. The lists of sound files (`src/15-voice-files.js`, `src/16-inst-files.js`) are generated from the `voice/` and `inst/` folders.

## Credits

- **Instrument recordings:** Salamander Grand Piano by Alexander Holm (CC BY 3.0), MuldjordKit by Lars Muldjord (CC BY 4.0), Karoryfer Samples and Versilian Studios VSCO 2 Community Edition via tonejs-instruments by Nicholaus Brosowsky (CC BY 3.0), and VSCO 2 Community Edition (CC0). Full details are in [`inst/CREDITS.txt`](inst/CREDITS.txt) and in the app under Project → Credits.
- **Fonts:** Atkinson Hyperlegible, Bricolage Grotesque and DM Mono from Google Fonts (SIL Open Font License).
- **Woofer's voice:** recorded by [your name].

## How it was made

<!-- Edit this section so it describes exactly what you did. -->
I designed Loopling Studio, its lessons and Woofer, tested every version, and recorded all of Woofer's voice lines. I built it with Claude, an AI coding assistant made by Anthropic, which wrote most of the code from my directions.
