// Renderizza UNA clip breve per ogni passaggio a un controllo (pannello split),
// invece di un video lungo quasi tutto vuoto.
//   node scripts/render-splits.mjs            -> usa i dati di Root.tsx
//   node scripts/render-splits.mjs '{"targetName":"Rossi"}'   -> override opzionali
import path from "node:path";
import fs from "node:fs";
import {bundle} from "@remotion/bundler";
import {renderMedia, selectComposition} from "@remotion/renderer";

const CLIP_SECONDS = 9; // il pannello resta visibile circa 8,6 s
const inputProps = process.argv[2] ? JSON.parse(process.argv[2]) : {};

const serveUrl = await bundle({entryPoint: path.resolve("src/index.ts")});
const comp = await selectComposition({serveUrl, id: "Splits", inputProps});

const {athletes, targetName, startOffset} = comp.props;
const target = athletes.find((a) => a.name === targetName);
const fps = comp.fps;

const outDir = path.resolve("out/splits");
fs.mkdirSync(outDir, {recursive: true});

const fmt = (t) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const index = [`Posizionare ogni clip sulla timeline al tempo indicato (dall'inizio del video overlay/gara + startOffset ${startOffset}s).`, ""];

for (let i = 0; i < target.splits.length; i++) {
  const from = Math.round((target.splits[i] - startOffset) * fps);
  if (from < 0) continue; // controllo precedente all'inizio scelto
  const to = Math.min(comp.durationInFrames - 1, from + Math.ceil(CLIP_SECONDS * fps));
  const name = `split_C${String(i + 1).padStart(2, "0")}.mov`;

  console.log(`Rendering ${name} (frame ${from}-${to})`);
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: "prores",
    proResProfile: "4444",
    pixelFormat: "yuva444p10le",
    imageFormat: "png",
    outputLocation: path.join(outDir, name),
    frameRange: [from, to],
    inputProps,
  });

  index.push(`${name}  ->  tempo di gara ${fmt(target.splits[i])}  (posizione sulla timeline: ${fmt(target.splits[i] - startOffset)})`);
}

fs.writeFileSync(path.join(outDir, "INDICE.txt"), index.join("\n"));
console.log("Fatto. Vedi out/splits/INDICE.txt");
