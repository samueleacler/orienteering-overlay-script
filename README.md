# 🧭 Orienteering Video Overlay

Data-driven graphic overlay generator for POV orienteering videos, built with [Remotion](https://www.remotion.dev/) and React.

This tool takes a GPS track (`.gpx`) and race results (`.xlsx`) as input to generate animated, transparent video clips (alpha channel), ready to be overlaid onto first-person videos (e.g., headcams) during video editing.

## ✨ Features

* **Deterministic sync:** Everything is frame-driven. No inaccurate timers: every animation is strictly tied to the race time calculated from the GPX and the starting offset.
* **Real-time sensors:** Dynamic calculation of heart rate, pace (on a 10s rolling window for better stability), slope (%) calculated over the last 15s, and smoothed accumulated elevation gain.
* **Dynamic standings:** Partial standings at each control point passage (Overall Top 3 + target athlete's gap) and leg times.
* **Optimized for editing:** Native export in Apple ProRes 4444 (`.mov`) for maximum quality and perfect alpha channel handling in NLE software like Final Cut Pro and DaVinci Resolve.

## 🚀 Installation

1. Make sure you have Node.js installed.
2. Clone the repository and navigate into the folder:
   ```bash
   git clone https://github.com/samueleacler/orienteering-overlay-script.git
   cd orienteering-overlay-script
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## 🏃‍♂️ Usage

1. Copy your personal race files `results.xlsx` and `track.gpx` into the `public/` folder.
2. Open `src/Root.tsx` and set the race data (or modify them in real-time from the "Props" panel in the Remotion Studio):
   * `raceName` and `category`
   * `targetName` (exact name of the athlete to track)
   * `startOffset` (seconds from which to start the overlay relative to the start)
3. Start the preview:
   ```bash
   npm run studio
   ```
   *(Note: the green background is only visible during preview to check contrast).*

## 🎬 Rendering and Exporting

The project includes three different compositions to optimize rendering times and give you flexibility on the timeline:

* **Full Overlay (1920x1080):**
  Exports the entire screen.
  ```bash
  npm run render:mov
  ```
* **Left Data Panel (340x540):**
  Exports only the sensors to save processed pixels. Place at `X=25, Y=540` on a 1080p timeline.
  ```bash
  npm run render:left
  ```
* **Split Clips (440x420):**
  Instead of exporting a mostly empty video 90% of the time, this command generates a single short clip (about 9 seconds) for each control passage and an `INDICE.txt` file with timestamp instructions to place each clip on your editing timeline.
  ```bash
  npm run render:splits-clips
  ```