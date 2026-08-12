export interface GeneInfo {
  name: string
  chr: string
  start: number
  end: number
  strand: '+' | '-'
  description: string
  genome?: string
  id?: string
  transcriptionClass?: string
  // Each exon may carry a CDS sub-interval (`cdsStart`/`cdsEnd`).  When
  // present, the exon is rendered as: thin UTR block on the left (start..cdsStart),
  // a thick CDS block (cdsStart..cdsEnd), and a thin UTR block on the right
  // (cdsEnd..end) — the canonical eg3 geneAnnotation rendering.
  exons?: Array<{ start: number; end: number; cdsStart?: number; cdsEnd?: number }>
}

export const SAMPLE_GENES: GeneInfo[] = [
  {
    name: 'HOXD10',
    chr: 'chr7',
    start: 27210000,
    end: 27220000,
    strand: '+',
    description: 'Homeobox D10 transcriptional regulator',
    genome: 'hg38',
    exons: [
      { start: 27210000, end: 27211500 },
      { start: 27215000, end: 27220000 }
    ]
  },
  {
    name: 'HOXD9',
    chr: 'chr7',
    start: 27225000,
    end: 27232000,
    strand: '+',
    description: 'Homeobox D9 transcriptional regulator',
    genome: 'hg38',
    exons: [
      { start: 27225000, end: 27227000 },
      { start: 27229000, end: 27232000 }
    ]
  },
  {
    name: 'HOXD13',
    chr: 'chr7',
    start: 27195000,
    end: 27202000,
    strand: '+',
    description: 'Homeobox D13 morphogenesis regulator',
    genome: 'hg38',
    exons: [
      { start: 27195000, end: 27197000 },
      { start: 27199000, end: 27202000 }
    ]
  },
  {
    name: 'TP53',
    chr: 'chr17',
    start: 7668421,
    end: 7687490,
    strand: '-',
    description: 'Tumor protein p53 cellular tumor antigen',
    genome: 'hg38',
    exons: [
      { start: 7668421, end: 7669600 },
      { start: 7673700, end: 7674200 },
      { start: 7675000, end: 7676500 },
      { start: 7687000, end: 7687490 }
    ]
  },
  {
    name: 'BRCA1',
    chr: 'chr17',
    start: 43044295,
    end: 43125483,
    strand: '-',
    description: 'BRCA1 DNA repair associated tumor suppressor',
    genome: 'hg38',
    exons: [
      { start: 43044295, end: 43045000 },
      { start: 43060000, end: 43062000 },
      { start: 43090000, end: 43095000 },
      { start: 43124000, end: 43125483 }
    ]
  },
  {
    name: 'EGFR',
    chr: 'chr7',
    start: 55086724,
    end: 55324313,
    strand: '+',
    description: 'Epidermal growth factor receptor tyrosine kinase',
    genome: 'hg38',
    exons: [
      { start: 55086724, end: 55088000 },
      { start: 55150000, end: 55152000 },
      { start: 55270000, end: 55273000 },
      { start: 55320000, end: 55324313 }
    ]
  },
  {
    name: 'MYC',
    chr: 'chr8',
    start: 127735434,
    end: 127742951,
    strand: '+',
    description: 'MYC proto-oncogene bHLH transcription factor',
    genome: 'hg38',
    exons: [
      { start: 127735434, end: 127736600 },
      { start: 127738000, end: 127739500 },
      { start: 127741000, end: 127742951 }
    ]
  },
  {
    name: 'GAPDH',
    chr: 'chr12',
    start: 6534517,
    end: 6538371,
    strand: '+',
    description: 'Glyceraldehyde-3-phosphate dehydrogenase housekeeping gene',
    genome: 'hg38',
    exons: [
      { start: 6534517, end: 6535200 },
      { start: 6536500, end: 6537100 },
      { start: 6537800, end: 6538371 }
    ]
  },
  {
    name: 'ACTB',
    chr: 'chr7',
    start: 5527148,
    end: 5530601,
    strand: '-',
    description: 'Actin beta cytoskeletal structural protein',
    genome: 'hg38',
    exons: [
      { start: 5527148, end: 5528000 },
      { start: 5529000, end: 5530000 },
      { start: 5530200, end: 5530601 }
    ]
  }
]
