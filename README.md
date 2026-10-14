# Orienteering Overlay (Remotion)

## Setup (una volta)
    npm install

## Uso
1. Copia in `public/` i file `results.xlsx` e `track.gpx`.
2. In `src/Root.tsx` imposta `raceName`, `category`, `targetName`
   (o modificali nello Studio, pannello "Props").
3. Anteprima: `npm run studio` (sfondo verde solo in anteprima).
4. Test rapido (primi 10 s): `npm run test:10s`
5. Render completo con trasparenza:
   - ProRes 4444 (.mov, consigliato per Final Cut/Premiere/DaVinci): `npm run render:mov`
   - WebM VP8 con alfa: `npm run render:webm`

Il file finisce in `out/`. Sovrapponilo al video della gara, allineando lo start.
`startOffset` (in secondi) serve per far partire l'overlay da un punto diverso della gara.

## Differenze rispetto al prototipo HTML
- Tutto è funzione del frame: niente setInterval, niente timer. Ogni frame è deterministico.
- Pace calcolato sugli ultimi 10 s di GPX (più stabile del singolo intervallo).
- Il nome atleta viene risolto una volta sola; errore chiaro se non trovato.
- Dislivello: pendenza (ultimi 15 s) e D+ accumulato, letti dal tag `<ele>` del GPX.
  La quota viene livellata (`ELE_SMOOTH_RADIUS` in `src/data.ts`): il D+ può differire
  da quello dell'orologio o di Strava, che usano altimetro barometrico/correzioni proprie.
  Se il GPX non ha quota, i due campi mostrano `--`.

## Due video separati (meno pixel)
Composizioni disponibili nello Studio: `Overlay` (tutto, 1920x1080), `Left` (340x540) e `Splits` (440x420).

- Colonna sinistra: `npm run render:left` -> `out/left.mov`. Posizione nel montaggio (su 1920x1080): X=25, Y=540.
- Split al centro, un solo video lungo: `npm run render:splits` -> `out/splits_full.mov`. Posizione: X=740, Y=330.
- Split al centro, una clip per controllo (molto più veloce): `npm run render:splits-clips`.
  Crea `out/splits/split_C01.mov`, ... e `INDICE.txt` con il momento in cui mettere ciascuna clip.
