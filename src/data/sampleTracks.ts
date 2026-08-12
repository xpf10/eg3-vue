import { Track } from '../types/track'

export const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-refgene-hg38',
    name: 'refGene Annotation',
    type: 'geneAnnotation',
    genome: 'hg38',
    showOnHubLoad: true,
    visible: true,
    options: {
      color: '#38bdf8',
      displayMode: 'full',
      height: 70
    },
    metadata: {
      assay: 'Gene Annotation',
      cell: 'RefSeq',
      lab: 'NCBI'
    }
  },
  {
    id: 'track-rgc-atac',
    name: 'RGC ATAC-seq Signal',
    type: 'bigwig',
    url: 'https://epigenome.wustl.edu/EyeEpigenome/data/ATAC_50bs/RGC.RPKM.bw',
    genome: 'hg38',
    showOnHubLoad: true,
    visible: true,
    options: {
      color: '#10b981',
      scaleType: 'auto',
      height: 60,
      group: 1
    },
    metadata: {
      cell: 'Retinal Ganglion Cell (RGC)',
      assay: 'ATAC-seq',
      tissue: 'Retina',
      lab: 'WashU Epigenome'
    }
  },
  {
    id: 'track-rgc-rna',
    name: 'RGC RNA-seq Signal',
    type: 'bigwig',
    url: 'https://epigenome.wustl.edu/EyeEpigenome/data/RNA_50bs/RGC.RPKM.bw',
    genome: 'hg38',
    showOnHubLoad: true,
    visible: true,
    options: {
      color: '#ec4899',
      scaleType: 'auto',
      height: 60,
      group: 1
    },
    metadata: {
      cell: 'Retinal Ganglion Cell (RGC)',
      assay: 'RNA-seq',
      tissue: 'Retina',
      lab: 'WashU Epigenome'
    }
  },
  {
    id: 'track-bam-alignments',
    name: 'RNA-seq Read Alignments (BAM)',
    type: 'bam',
    url: 'https://vizhub.wustl.edu/public/bam/RGC_sample.bam',
    genome: 'hg38',
    showOnHubLoad: true,
    visible: true,
    options: {
      color: '#64748b',
      showMismatch: true,
      height: 80
    },
    metadata: {
      cell: 'RGC',
      assay: 'Paired-End RNA-seq',
      lab: 'WashU Epigenome'
    }
  },
  {
    id: 'track-synteny-hg38-mm10',
    name: 'hg38 vs mm10 Synteny Alignment',
    type: 'genomealign',
    url: 'https://vizhub.wustl.edu/public/hg38/weaver/hg38_mm10_axt.gz',
    genome: 'hg38',
    querygenome: 'mm10',
    showOnHubLoad: true,
    visible: true,
    options: {
      color: '#38bdf8',
      secondaryColor: '#f97316',
      height: 55
    },
    metadata: {
      assay: 'Genome Alignment',
      lab: 'WashU Weaver'
    }
  }
]

export const CATALOG_TRACKS: Track[] = [
  ...DEFAULT_TRACKS,
  {
    id: 'catalog-h3k9me3',
    name: 'H3K9me3 Heterochromatin Mark',
    type: 'bigwig',
    url: 'https://epigenome.wustl.edu/tracks/H3K9me3.bw',
    genome: 'hg38',
    options: { color: '#8257e5', height: 55 },
    metadata: { cell: 'MSN', assay: 'ChIP-seq (H3K9me3)', tissue: 'Brain', lab: 'Ren Lab' }
  },
  {
    id: 'catalog-methylc',
    name: 'CpG Methylation Level (MethylC)',
    type: 'methylc',
    url: 'https://epigenome.wustl.edu/tracks/MethylC.bw',
    genome: 'hg38',
    options: { color: '#ef4444', height: 50 },
    metadata: { cell: 'H1-hESC', assay: 'Bisulfite-Seq', tissue: 'Embryonic', lab: 'Ecker Lab' }
  },
  {
    id: 'catalog-vcf-variants',
    name: '1000 Genomes SNV & Indel Variants',
    type: 'vcf',
    url: 'https://vizhub.wustl.edu/public/vcf/1kgenomes.vcf.gz',
    genome: 'hg38',
    options: { color: '#10b981', height: 50 },
    metadata: { cell: 'Blood', assay: 'Whole Genome Sequencing', lab: '1000G' }
  },
  {
    id: 'catalog-bed-peaks',
    name: 'ENCODE Candidate Regulatory Elements (cCREs)',
    type: 'bed',
    url: 'https://vizhub.wustl.edu/public/bed/ccres.bed.gz',
    genome: 'hg38',
    options: { color: '#06b6d4', height: 45 },
    metadata: { cell: 'Multi-cell', assay: 'cCRE Peaks', lab: 'ENCODE' }
  }
]
