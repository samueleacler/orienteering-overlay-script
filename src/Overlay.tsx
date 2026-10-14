import React from "react";
import {AbsoluteFill, Easing, getRemotionEnvironment, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {
  Athlete,
  Entry,
  GpxPoint,
  cumulativeAt,
  formatTime,
  legAt,
  sensorsAt,
  standings,
} from "./data";

export type OverlayProps = {
  raceName: string;
  category: string;
  targetName: string;
  resultsFile: string;
  gpxFile: string;
  startOffset: number;
  athletes: Athlete[];
  gpx: GpxPoint[];
  part?: "all" | "left" | "splits";
};

const ROW_H = 40;
const SEP_GAP = 14;
const SPRING = Easing.bezier(0.34, 1.56, 0.64, 1);
const SHADOW = "1px 1px 4px rgba(0,0,0,0.9)";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const panel: React.CSSProperties = {
  backgroundColor: "rgba(15,15,15,0.85)",
  borderRadius: 12,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,0.1)",
};
const sub: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  textShadow: SHADOW,
};
const sensorHeader: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  color: "#aaaaaa",
  marginBottom: 5,
};
const sensorValue: React.CSSProperties = {fontSize: 20, fontWeight: "bold"};
const unit: React.CSSProperties = {fontSize: 12, fontWeight: "normal"};

const Row: React.FC<{e: Entry; style?: React.CSSProperties}> = ({e, style}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      height: ROW_H,
      boxSizing: "border-box",
      padding: "4px 0",
      fontSize: 15,
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      color: e.isMe ? "#facc15" : "white",
      ...style,
    }}
  >
    <div style={{display: "flex", gap: 10}}>
      <span style={{fontWeight: "bold", width: 18, color: e.isMe ? "#facc15" : "#aaaaaa"}}>
        {e.rank}.
      </span>
      <span style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160}}>
        {e.name}
      </span>
    </div>
    <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
      <span style={{fontWeight: "bold"}}>{formatTime(e.value)}</span>
      {e.diff > 0 && (
        <span style={{fontSize: 11, color: e.isMe ? "#facc15" : "#f87171"}}>+{formatTime(e.diff)}</span>
      )}
    </div>
  </div>
);

export const Overlay: React.FC<OverlayProps> = (props) => {
  const {targetName, startOffset, athletes, gpx, part = "all"} = props;
  const showLeft = part !== "splits";
  const showSplits = part !== "left";
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {isStudio} = getRemotionEnvironment();

  const seconds = startOffset + frame / fps;
  const whole = Math.floor(seconds);

  const targetSplits = athletes.find((a) => a.name === targetName)?.splits ?? [];
  const passed = targetSplits.filter((s) => seconds > s).length;
  const ci = passed - 1;

  let legText = "Start - Control 1";
  if (passed > 0 && passed < targetSplits.length) {
    legText = `Control ${passed} - ${passed + 1}`;
  } else if (passed >= targetSplits.length && targetSplits.length > 0) {
    legText = "Finish";
  }

  const GPX_OFFSET = 10;
  const {hr, pace, grade, gain} = sensorsAt(gpx, whole + GPX_OFFSET);
  
  const gradeColor = grade === null || Math.abs(grade) < 2 ? "white" : grade > 0 ? "#fb923c" : "#4ade80";
  const gradeText =
    grade === null ? "--" : `${grade > 0.5 ? "▲ +" : grade < -0.5 ? "▼ " : ""}${Math.round(grade)}`;

  const cur = ci >= 0 ? standings(athletes, cumulativeAt(ci), targetName, 3) : [];
  const prev = ci >= 1 ? standings(athletes, cumulativeAt(ci - 1), targetName, 3) : [];
  const sinceCross = ci >= 0 ? seconds - targetSplits[ci] : 0;
  const p = interpolate(sinceCross, [0, 1.2], [0, 1], {extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: SPRING});
  const pLin = Math.min(1, Math.max(0, p));

  const slotY = (slot: number) => slot * ROW_H + (slot === 3 ? SEP_GAP : 0);
  const names = Array.from(new Set([...prev.map((e) => e.name), ...cur.map((e) => e.name)]));
  const hasMeRow = cur.some((e) => e.slot === 3);
  const lbHeight = cur.length === 0 ? 0 : hasMeRow ? slotY(3) + ROW_H : cur.length * ROW_H;

  const legEntries = ci >= 0 ? standings(athletes, legAt(ci), targetName, 5) : [];
  const legIn = interpolate(sinceCross, [0, 0.6], [0, 1], {extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: SPRING});
  const legOut = interpolate(sinceCross, [8, 8.6], [1, 0], {extrapolateRight: "clamp", extrapolateLeft: "clamp"});
  const legOpacity = Math.min(Math.min(1, legIn), legOut);
  const legTitle = `⚡ Leg Splits: ${ci === 0 ? "Start" : `C${ci}`} ➔ C${ci + 1}`;

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: "white", backgroundColor: isStudio ? "#00FF00" : undefined}}>
      {showLeft && (
      <div style={{position: "absolute", top: part === "left" ? 0 : "50%", left: part === "left" ? 25 : 50, width: 290, display: "flex", flexDirection: "column", gap: 12}}>
        
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 5px", marginBottom: 5}}>
          <div>
            <div style={sub}>{targetName}</div>
            <div style={{fontSize: 18, fontWeight: "bold", marginTop: 4, textShadow: SHADOW}}>{legText}</div>
          </div>
          <div>
            <div style={{...sub, textAlign: "right"}}>Race Time</div>
            <div style={{fontSize: 24, fontWeight: "bold", textAlign: "right", textShadow: SHADOW, fontVariantNumeric: "tabular-nums", minWidth: 110}}>{formatTime(whole)}</div>
          </div>
        </div>

        <div style={{display: "flex", gap: 15}}>
          <div style={{...panel, flex: 1}}>
            <div style={sensorHeader}>♡ HR</div>
            <div style={{...sensorValue, color: "#38bdf8"}}>
              <span>{hr ?? "--"}</span> <span style={unit}>bpm</span>
            </div>
          </div>
          <div style={{...panel, flex: 1}}>
            <div style={sensorHeader}>✦ Pace</div>
            <div style={{...sensorValue, color: "#f87171"}}>
              <span>{pace ?? "--:--"}</span> <span style={unit}>/km</span>
            </div>
          </div>
        </div>

        <div style={{display: "flex", gap: 15}}>
          <div style={{...panel, flex: 1}}>
            <div style={sensorHeader}>⛰ Slope</div>
            <div style={{...sensorValue, color: gradeColor}}>
              <span>{gradeText}</span> <span style={unit}>%</span>
            </div>
          </div>
          <div style={{...panel, flex: 1}}>
            <div style={sensorHeader}>▲ Ascent</div>
            <div style={sensorValue}>
              <span>{gain === null ? "--" : Math.round(gain)}</span> <span style={unit}>m</span>
            </div>
          </div>
        </div>

        <div style={panel}>
          <div style={{fontSize: 13, fontWeight: "bold", marginBottom: 10}}>
            🏆 Standings: <span>{ci >= 0 ? `Control ${ci + 1}` : "In attesa..."}</span>
          </div>
          <div style={{position: "relative", height: lbHeight}}>
            {names.map((name) => {
              const from = prev.find((e) => e.name === name);
              const to = cur.find((e) => e.name === name);
              const entry = (to ?? from) as Entry;
              let y: number;
              let opacity = 1;
              if (from && to) y = slotY(from.slot) + (slotY(to.slot) - slotY(from.slot)) * p;
              else if (to) {
                y = slotY(to.slot) + 15 * (1 - pLin);
                opacity = pLin;
              } else {
                y = slotY(from!.slot);
                opacity = 1 - pLin;
              }
              return <Row key={name} e={entry} style={{position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${y}px)`, opacity}} />;
            })}
            {hasMeRow && (
              <div style={{position: "absolute", left: 0, right: 0, top: 3 * ROW_H, height: SEP_GAP, textAlign: "center", lineHeight: "10px", color: "#aaaaaa"}}>
                . . .
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {showSplits && legOpacity > 0 && legEntries.length > 0 && (
        <div
          style={{
            ...panel,
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 380,
            opacity: legOpacity,
            transform: `translate(-50%, ${-50 + (1 - legIn) * 10}%)`,
          }}
        >
          <div style={{fontSize: 14, fontWeight: "bold", color: "#facc15", marginBottom: 10, textAlign: "center", textTransform: "uppercase", textShadow: SHADOW}}>
            {legTitle}
          </div>
          {legEntries.map((e) => (
            <React.Fragment key={e.name}>
              {e.slot === 5 && <div style={{textAlign: "center", lineHeight: "10px", color: "#aaaaaa", margin: "2px 0"}}>. . .</div>}
              <Row e={e} />
            </React.Fragment>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};