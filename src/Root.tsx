import React from "react";
import {CalculateMetadataFunction, Composition, staticFile} from "remotion";
import {Overlay, OverlayProps} from "./Overlay";
import {parseGpx, parseResults} from "./data";

const FPS = 24;

const calculateMetadata: CalculateMetadataFunction<OverlayProps> = async ({props}) => {
  const athletes = await parseResults(staticFile(props.resultsFile));
  const gpx = await parseGpx(staticFile(props.gpxFile));

  const target = athletes.find((a) =>
    a.name.toLowerCase().includes(props.targetName.toLowerCase())
  );
  if (!target) {
    throw new Error(
      `Atleta "${props.targetName}" non trovato in ${props.resultsFile}. Controlla il nome.`
    );
  }

  const finish = target.splits[target.splits.length - 1];
  const seconds = Math.max(1, finish + 60 - props.startOffset);

  return {
    durationInFrames: Math.ceil(seconds * FPS),
    props: {...props, athletes, gpx, targetName: target.name},
  };
};

// Modifica qui i dati della gara (valgono per tutte le composizioni)
const defaults: OverlayProps = {
  raceName: "Coppa Italia Long - Highlands Open 2026",
  category: "M21",
  targetName: "Samuele Acler",
  resultsFile: "results.xlsx",
  gpxFile: "track.gpx",
  startOffset: 0, // secondi di gara da cui iniziare
  athletes: [],
  gpx: [],
  part: "all",
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Tutto insieme, a schermo intero (come prima) */}
    <Composition
      id="Overlay"
      component={Overlay}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={FPS * 60}
      calculateMetadata={calculateMetadata}
      defaultProps={defaults}
    />

    {/* Solo la colonna di sinistra. Posizione nel montaggio: x=25, y=540 (su 1920x1080) */}
    <Composition
      id="Left"
      component={Overlay}
      width={340}
      height={540}
      fps={FPS}
      durationInFrames={FPS * 60}
      calculateMetadata={calculateMetadata}
      defaultProps={{...defaults, part: "left"}}
    />

    {/* Solo il pannello split al centro. Posizione nel montaggio: x=740, y=330 (su 1920x1080) */}
    <Composition
      id="Splits"
      component={Overlay}
      width={440}
      height={420}
      fps={FPS}
      durationInFrames={FPS * 60}
      calculateMetadata={calculateMetadata}
      defaultProps={{...defaults, part: "splits"}}
    />
  </>
);
