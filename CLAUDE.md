# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WashU Epigenome Browser v3 — a Vue 3 + TypeScript + Vite single-page app that visualizes genomic data tracks (BigWig, BED, BAM, Hi-C, VCF, etc.) on a high-DPI HTML5 Canvas. Default dev server port is **5174**.

## Development Commands

```bash
npm install              # install dependencies
npm run dev              # dev server (Vite, port 5174)
npm run build            # vue-tsc type-check + vite build
npm run preview          # serve the production build
```

There is **no test framework** and **no linter** configured. `npm run build` (which runs `vue-tsc -b`) is the only pre-built validation gate.

## Architecture at a Glance

```
src/
  main.ts                  # creates Vue app, installs Pinia, polyfills Buffer globally
  App.vue                  # root layout, hosts all modals via local ref state
  stores/                  # 4 Pinia stores (Composition API, function syntax)
    genomeStore.ts         # current genome, viewRegion, windowWidth, undo/redo history
    trackStore.ts          # tracks[], visibleTracks, selectedTrackId, add/remove/reorder
    sessionStore.ts        # save/load/export/import sessions, bookmarks (localStorage)
    themeStore.ts          # isDarkMode, persisted to localStorage
  services/
    canvasRenderer.ts      # CanvasTrackRenderer — single class, all static methods
    localFileLoader.ts     # LocalFileLoader — parses local files (.bw/.bed/.bam/.vcf/.gff)
    trackDataFetcher.ts    # fetchRealRefGeneData + searchGeneByName (WashU + MyGene APIs)
    pdfExport.ts           # PDFExporter — jsPDF landscape A4 report
  components/
    layout/    # HeaderNav, AppFooter
    navigation/# CytobandView, ChromosomeRuler, CoordinateSearch, GenomePicker, NavToolbar
    tracks/    # TrackContainer, TrackCanvasRenderer, TrackHeader,
               # AddTrackModal, TrackSettingsModal, TrackFacetTable
    sessions/  # SessionManager
    ui/        # Modal
  types/       # genome.ts, region.ts, track.ts, session.ts
  data/        # sampleTracks.ts (DEFAULT_TRACKS, CATALOG_TRACKS),
               # sampleGenes.ts, genomes/allGenomes.ts + hg38.ts + mm10.ts
```

### Data Flow

1. **Stores own state.** Components read from and call actions on stores; they rarely hold their own domain state. `App.vue` is the exception — it owns the boolean state for which modals are open and passes `selectedTrackForConfig` down.
2. **Reactivity drives rendering.** `TrackCanvasRenderer.vue` watches `genomeStore.viewRegion`, `track`, `track.options`, `track.items`, `track.visible`, and `themeStore.isDarkMode`. Any change re-renders the canvas. A `ResizeObserver` also triggers re-render on container resize.
3. **`CanvasTrackRenderer.render()` dispatches by `track.type`** to one of eight private static methods (`renderBigWig`, `renderGeneAnnotation`, `renderBed`, `renderBam`, `renderHiC`, `renderSynteny`, `renderMethylC`, `renderVcf`). Each draws directly on the Canvas 2D context.

### Rendering: Real Data vs. Deterministic Fallback

Every track renderer follows the same pattern:

- **If real data is available** (e.g. `track.bwInstance` for BigWig, parsed `track.items` for BED, cached gene features), draw that data.
- **Otherwise**, draw a deterministic visualization seeded from a hash of `track.id + track.name + track.url`. This guarantees the same track always looks the same across zoom levels and reloads, but produces no real signal.

Real BigWig signal is fetched asynchronously via `LocalFileLoader.getBigWigSignalFeatures()`. The renderer passes an `onAsyncUpdate` callback so the canvas re-draws once real features arrive. A module-level `bwSignalCache` / `realGeneCache` `Map` prevents redundant fetches.

### Genome Assemblies

Five built-in assemblies: `hg38`, `hg19`, `mm10`, `mm39`, `t2t-chm13-v2.0`. Only `hg38` and `mm10` ship with their own chromosome/cytoband data; `hg19` and `t2t-chm13-v2.0` reuse `hg38`'s data, and `mm39` reuses `mm10`'s. Default region on load is `chr7:27053397-27373765`.

### Navigation History

`genomeStore` maintains an undo/redo stack of `GenomicRegion` objects. Every `setRegion()` call records the new region (unless explicitly suppressed). `zoomIn`/`zoomOut`/`panLeft`/`panRight` all funnel through `setRegion()`.

### Track Types

`bigwig`, `geneAnnotation`, `bed`, `bam`, `hic`, `genomealign`, `methylc`, `vcf`. Each has a `TrackOptions` object (`color`, `height`, `scaleType`, `displayMode`, etc.) and optional `TrackMetadata` (assay, cell, lab, tissue).

### Dev Server Proxies (vite.config.ts)

| Prefix         | Target                              | Notes                                       |
|----------------|-------------------------------------|---------------------------------------------|
| `/api-washu`   | `https://lambda.epigenomegateway.org` | Epigenome Browser API (gene annotations)    |
| `/api-chipseq` | `http://10.1.20.6:8080`             | Internal server; forwards `Range` header    |

`trackDataFetcher.ts` and `localFileLoader.ts` detect `localhost` and switch to the proxy path automatically.

### Node Polyfills

`vite-plugin-node-polyfills` provides `Buffer`, `global`, and `process`. `main.ts` additionally attaches `Buffer` to `window`. This is required by `@gmod/bbi` (BigWig parser) and `generic-filehandle`.

### Styling

Tailwind CSS v3 with a slate/cyan dark-mode palette. Theme classes are toggled on `<html>` via `themeStore.applyTheme()` (`dark` vs `light` class). Components use inline `:class` / `:style` bindings against `themeStore.isDarkMode` — there is no dedicated CSS-in-JS or design token file. Custom scrollbar styling lives in `src/style.css`.

### Key External APIs

- **WashU Epigenome Gateway** (`lambda.epigenomegateway.org/v3/{genome}/genes/{trackName}/queryRegion`) — real RefGene gene annotations.
- **MyGene.info** (`mygene.info/v3/query`) — gene name → locus lookup for autocomplete.
- **ENCODE CDN** — automatic fallback for BigWig URLs containing `ENCFF…` IDs.