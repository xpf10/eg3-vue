# WashU Epigenome Browser (Vue 3 Edition)

A high-performance Vue 3 + TypeScript + Vite implementation of the 3rd Generation **WashU Epigenome Browser** (`eg3`).

## 🌟 Key Features

- **Vue 3 Composition API & TypeScript**: Modular, reactive, and type-safe architecture.
- **Pinia State Store**: State management for genome assemblies, view region coordinates, navigation history, and track options.
- **High DPI HTML5 Canvas Rendering**: 60fps interactive track visualization with hover crosshair and basepair coordinate tooltips.
- **Comprehensive Track Types**:
  - **BigWig**: Continuous numerical signal curves (ATAC-seq, RNA-seq, ChIP-seq, histone marks), auto/fixed Y-scale.
  - **Gene Annotation**: Exons, introns, strand orientation arrows, transcript isoform views.
  - **BED / Peak**: Peak loci and genomic interval blocks.
  - **BAM Alignment**: Coverage histogram, read alignments, and CIGAR mismatch base colors (A, C, G, T, N).
  - **Hi-C / Chromatin Interaction**: Arc view visualization for chromatin loops and 3D contact intensity.
  - **Synteny / Genome Alignment**: Query vs Target genome alignment ribbons (e.g., `hg38` vs `mm10`).
  - **MethylC / Methylation**: CpG methylation ratio bars (0% - 100%).
  - **VCF / Variant**: SNV and Indel locus pins.
- **Genome Assemblies & Navigation**:
  - Built-in assemblies (`hg38`, `hg19`, `mm10`, `mm39`, `t2t-chm13-v2.0`).
  - Chromosome cytoband schematic with red view range box.
  - Basepair coordinate ruler with dynamic major/minor tick marks.
  - Quick gene search autocomplete (*HOXD10*, *TP53*, *BRCA1*, *EGFR*, *MYC*, *ACTB*, *TNF*, *GAPDH*).
  - Zoom (2x, 5x) and Pan controls with Undo/Redo history.
- **Track Controls & Metadata**:
  - Add tracks from pre-configured ENCODE/Roadmap catalog or custom BigWig/BED/BAM/Hi-C/VCF URLs.
  - Reorder, pin to top, hide/show, change color, adjust track height, scale mode, and display density ('full', 'dense', 'squish', 'pack').
  - Metadata Facet Matrix table for filtering tracks by assay, cell line, and laboratory.
- **Sessions & Exporting**:
  - Save/Load browser state, import/export session JSON.
  - Locus bookmarks.
  - Export PDF summary reports.

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open in browser at `http://localhost:5174/`

## 🔨 Build for Production

```bash
npm run build
```
