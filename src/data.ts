import * as XLSX from "xlsx";

export type Athlete = {name: string; splits: number[]};
export type GpxPoint = {
  t: number;
  lat: number;
  lon: number;
  hr: number | null;
  ele: number | null; // quota (m), già livellata
  gain: number; // dislivello positivo accumulato fino a questo punto (m)
};

export const formatTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds)) return "--:--";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/* ---------- Parsing Excel / CSV (stessa logica del prototipo) ---------- */

export const parseResults = async (url: string): Promise<Athlete[]> => {
  const buf = await (await fetch(url)).arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), {type: "array"});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {header: 1, raw: false, defval: ""});
  const clean = (v: unknown) => String(v ?? "").replace(/\u00A0/g, " ").trim();

  const athletes: Athlete[] = [];
  for (const cols of rows) {
    if (!cols || cols.length === 0) continue;
    const rankRaw = clean(cols[0]);
    const name = clean(cols[1]);
    if (rankRaw === "" || isNaN(parseInt(rankRaw)) || name === "") continue;

    const splits: number[] = [];
    let last = -1;
    for (let i = 2; i < cols.length; i++) {
      const m = clean(cols[i]).match(/^(\d{1,2}:\d{2}:\d{2}|\d{1,3}:\d{2})/);
      if (!m) continue;
      const p = m[1].split(":").map((x) => parseInt(x, 10));
      const secs = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
      if (secs > last) {
        splits.push(secs);
        last = secs;
      }
    }
    if (splits.length > 0) athletes.push({name, splits});
  }
  return athletes;
};

/* ---------- Parsing GPX ---------- */

export const parseGpx = async (url: string): Promise<GpxPoint[]> => {
  const text = await (await fetch(url)).text();
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const pts = xml.getElementsByTagName("trkpt");
  const out: GpxPoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const timeNode = pt.getElementsByTagName("time")[0];
    if (!timeNode) continue;
    const hrNode =
      pt.getElementsByTagNameNS("*", "hr")[0] ??
      pt.getElementsByTagName("gpxtpx:hr")[0] ??
      pt.getElementsByTagName("ns3:hr")[0] ??
      pt.getElementsByTagName("hr")[0];
    const hr = hrNode ? parseInt(hrNode.textContent ?? "", 10) : NaN;
    const eleNode = pt.getElementsByTagName("ele")[0];
    const ele = eleNode ? parseFloat(eleNode.textContent ?? "") : NaN;
    out.push({
      t: new Date(timeNode.textContent ?? "").getTime(),
      lat: parseFloat(pt.getAttribute("lat") ?? "0"),
      lon: parseFloat(pt.getAttribute("lon") ?? "0"),
      hr: isNaN(hr) ? null : hr,
      ele: isNaN(ele) ? null : ele,
      gain: 0,
    });
  }
  return addElevation(out);
};

/* ---------- Quota: livellamento e dislivello accumulato ---------- */

// Il GPS ha rumore di diversi metri sulla quota: senza livellamento il D+ risulta gonfiato.
const ELE_SMOOTH_RADIUS = 5; // punti per lato (con GPX a 1 Hz = circa ±5 s)

const addElevation = (pts: GpxPoint[]): GpxPoint[] => {
  if (pts.every((p) => p.ele === null)) return pts; // GPX senza quota

  // riempi eventuali buchi con l'ultimo valore noto
  let last: number | null = pts.find((p) => p.ele !== null)!.ele;
  const raw = pts.map((p) => (last = p.ele ?? last) as number);

  const smooth = raw.map((_, i) => {
    const a = Math.max(0, i - ELE_SMOOTH_RADIUS);
    const b = Math.min(raw.length - 1, i + ELE_SMOOTH_RADIUS);
    let sum = 0;
    for (let k = a; k <= b; k++) sum += raw[k];
    return sum / (b - a + 1);
  });

  let gain = 0;
  return pts.map((p, i) => {
    if (i > 0 && smooth[i] > smooth[i - 1]) gain += smooth[i] - smooth[i - 1];
    return {...p, ele: smooth[i], gain};
  });
};

/* ---------- Sensori: HR e passo ---------- */

const distKm = (a: GpxPoint, b: GpxPoint) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// ultimo indice con t <= target (ricerca binaria)
const indexAt = (gpx: GpxPoint[], target: number) => {
  let lo = 0;
  let hi = gpx.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (gpx[mid].t <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
};

const PACE_WINDOW_MS = 10_000; // media sugli ultimi 10 s: molto meno ballerina del singolo intervallo

const GRADE_WINDOW_MS = 15_000; // pendenza calcolata sugli ultimi 15 s
const GRADE_MIN_DIST_M = 10; // sotto questa distanza (fermo) la pendenza non è affidabile

export const sensorsAt = (gpx: GpxPoint[], seconds: number) => {
  if (gpx.length < 2) {
    return {hr: null as number | null, pace: null as string | null, grade: null as number | null, gain: null as number | null};
  }
  const target = gpx[0].t + seconds * 1000;
  const i = indexAt(gpx, target);
  const j = indexAt(gpx, target - PACE_WINDOW_MS);

  let d = 0;
  for (let k = j; k < i; k++) d += distKm(gpx[k], gpx[k + 1]);
  const hours = (gpx[i].t - gpx[j].t) / 3_600_000;

  let pace: string | null = null;
  if (d > 0 && hours > 0) {
    const minKm = 60 / (d / hours);
    if (minKm > 2 && minKm < 40) {
      const m = Math.floor(minKm);
      const s = Math.floor((minKm - m) * 60);
      pace = `${m}:${String(s).padStart(2, "0")}`;
    }
  }
  // pendenza e dislivello
  let grade: number | null = null;
  let gain: number | null = null;
  if (gpx[i].ele !== null) {
    gain = gpx[i].gain;
    const k = indexAt(gpx, target - GRADE_WINDOW_MS);
    let dk = 0;
    for (let n = k; n < i; n++) dk += distKm(gpx[n], gpx[n + 1]);
    if (dk * 1000 >= GRADE_MIN_DIST_M) {
      const g = ((gpx[i].ele! - gpx[k].ele!) / (dk * 1000)) * 100;
      grade = Math.max(-60, Math.min(60, g));
    }
  }

  return {hr: gpx[i].hr, pace, grade, gain};
};

/* ---------- Classifiche ---------- */

export type Entry = {
  name: string;
  rank: number;
  value: number;
  diff: number;
  isMe: boolean;
  slot: number; // posizione visiva (0..topN)
};

export const standings = (
  athletes: Athlete[],
  valueOf: (a: Athlete) => number | undefined,
  targetName: string,
  topN: number
): Entry[] => {
  const valid = athletes
    .map((a) => ({name: a.name, v: valueOf(a)}))
    .filter((x): x is {name: string; v: number} => x.v !== undefined && !isNaN(x.v))
    .sort((a, b) => a.v - b.v);
  if (valid.length === 0) return [];

  const best = valid[0].v;
  const mk = (x: {name: string; v: number}, i: number, slot: number): Entry => ({
    name: x.name,
    rank: i + 1,
    value: x.v,
    diff: x.v - best,
    isMe: x.name === targetName,
    slot,
  });

  const out = valid.slice(0, topN).map((x, i) => mk(x, i, i));
  const me = valid.findIndex((x) => x.name === targetName);
  if (me >= topN) out.push(mk(valid[me], me, topN));
  return out;
};

export const cumulativeAt = (ci: number) => (a: Athlete) => a.splits[ci];

export const legAt = (ci: number) => (a: Athlete) => {
  if (a.splits[ci] === undefined) return undefined;
  if (ci === 0) return a.splits[0];
  if (a.splits[ci - 1] === undefined) return undefined;
  return a.splits[ci] - a.splits[ci - 1];
};
