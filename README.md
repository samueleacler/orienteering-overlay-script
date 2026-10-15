# 🧭 Orienteering Video Overlay

Data-driven graphic overlay generator for POV orienteering videos. Syncs GPX tracks and Excel results to render animated, transparent stats (ProRes/WebM) ready for video editing.

## ✨ Features

- **Deterministic Sync:** Everything is frame-driven. No imprecise timers: every animation is strictly linked to the race time calculated from the GPX and the starting offset.
- **Real-time Sensors:** Dynamic calculation of heart rate, pace (on a 10s moving window for better stability), slope (%) calculated over the last 15s, and smoothed accumulated elevation gain.
- **Dynamic Leaderboards:** Intermediate standings at each control point (Absolute Top 3 + target athlete's gap) and leg times.
- **Optimized for Editing:** Native export in Apple ProRes 4444 (`.mov`) for maximum quality and perfect alpha channel management in editing software like Final Cut Pro and DaVinci Resolve.

## 🚀 Installation

1. Make sure you have Node.js installed.
2. Clone the repository and enter the folder:
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
2. Open `src/Root.tsx` and set the race data (or edit them in real-time from the "Props" panel in the Remotion Studio):
   - `raceName` and `category`
   - `targetName` (exact name of the athlete to track)
   - `startOffset` (video alignment: seconds from the start of the video to the actual start of the race).
3. Adjust GPS Sync: Open `src/Overlay.tsx` and modify the `GPX_OFFSET` variable:
   ```typescript
   const GPX_OFFSET = 10; 
   const {hr, pace, grade, gain} = sensorsAt(gpx, whole + GPX_OFFSET);
   ```
   *Note: This value must be modified based on how many seconds before the actual race start you started recording the activity on your GPS watch (es. 10" in this case).*
4. Start the preview:
   ```bash
   npm run studio
   ```
   *(Note: the green background is only visible in preview mode to check contrasts).*

## 🎬 Rendering and Export

The project includes three different compositions to optimize rendering times and give you flexibility on the timeline:

- **Full Overlay (1920x1080):** Exports the entire screen.
  ```bash
  npm run render:mov
  ```
- **Left Data Panel (340x540):** Exports only the sensors to save processed pixels. Place at X=25, Y=540.
  ```bash
  npm run render:left
  ```
- **Splits Clips (440x420):** Instead of exporting an empty video for 90% of the time, this command generates a single short clip (about 9 seconds) for each control pass and an `INDEX.txt` file with temporal indications to place each clip on the timeline.
  ```bash
  npm run render:splits-clips
  ```