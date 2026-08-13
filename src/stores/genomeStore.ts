import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GenomeConfig } from '../types/genome'
import { GenomicRegion, parseGenomicRegion, formatGenomicRegion } from '../types/region'
import { ALL_GENOMES, getGenomeConfig } from '../data/genomes/allGenomes'
import { SAMPLE_GENES } from '../data/sampleGenes'
import { searchGeneByName } from '../services/trackDataFetcher'

export const useGenomeStore = defineStore('genome', () => {
  const currentGenome = ref<GenomeConfig>(getGenomeConfig('hg38'))
  const viewRegion = ref<GenomicRegion>({
    chr: 'chr7',
    start: 27053397,
    end: 27373765
  })

  // Navigation History stack
  const history = ref<GenomicRegion[]>([])
  const historyIndex = ref<number>(-1)

  const regionString = computed(() => formatGenomicRegion(viewRegion.value))
  const regionSpan = computed(() => Math.max(1, viewRegion.value.end - viewRegion.value.start + 1))
  const currentChromosomeSize = computed(() => {
    const chrObj = currentGenome.value.chromosomes.find(c => c.name.toLowerCase() === viewRegion.value.chr.toLowerCase())
    return chrObj ? chrObj.size : 200000000
  })

  function getChrSize(chrName: string): number {
    const norm = chrName.startsWith('chr') ? chrName : `chr${chrName}`
    const chrObj = currentGenome.value.chromosomes.find(c => c.name.toLowerCase() === norm.toLowerCase())
    return chrObj ? chrObj.size : 250000000
  }

  function recordHistory(reg: GenomicRegion) {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push({ ...reg })
    historyIndex.value = history.value.length - 1
  }

  function setGenome(name: string) {
    const config = getGenomeConfig(name)
    currentGenome.value = config
    const parsed = parseGenomicRegion(config.defaultRegion)
    if (parsed) {
      setRegion(parsed)
    }
  }

  function setRegion(newRegion: GenomicRegion | string, record = true) {
    let target: GenomicRegion | null
    if (typeof newRegion === 'string') {
      target = parseGenomicRegion(newRegion, viewRegion.value.chr)
    } else {
      target = { ...newRegion }
    }

    if (!target) return

    const normChr = target.chr.startsWith('chr') ? target.chr : `chr${target.chr}`

    // Reject chromosomes not defined in the current genome config (catches
    // alt/patch assemblies like FNWR*, QGOO*, GL* that MyGene may surface).
    const knownChr = currentGenome.value.chromosomes.find(
      c => c.name.toLowerCase() === normChr.toLowerCase()
    )
    if (!knownChr) {
      console.warn(
        `[genomeStore] setRegion rejected: ${normChr} is not a recognised chromosome in ${currentGenome.value.name}`
      )
      return
    }

    const maxChrSize = getChrSize(normChr)

    let start = Math.max(1, Math.min(target.start, maxChrSize))
    let end = Math.max(start + 10, Math.min(target.end, maxChrSize))

    // Minimum window size check (e.g. 50 bp)
    if (end - start < 50) {
      const mid = Math.floor((start + end) / 2)
      start = Math.max(1, mid - 25)
      end = Math.min(maxChrSize, mid + 25)
    }

    const finalRegion = { chr: normChr, start, end }
    viewRegion.value = finalRegion

    if (record) {
      recordHistory(finalRegion)
    }
  }

  function zoomIn(factor = 2) {
    const span = regionSpan.value
    const newSpan = Math.max(50, Math.floor(span / factor))
    const center = Math.floor((viewRegion.value.start + viewRegion.value.end) / 2)
    const half = Math.floor(newSpan / 2)
    setRegion({
      chr: viewRegion.value.chr,
      start: Math.max(1, center - half),
      end: Math.min(currentChromosomeSize.value, center + half)
    })
  }

  function zoomOut(factor = 2) {
    const span = regionSpan.value
    const newSpan = Math.floor(span * factor)
    const center = Math.floor((viewRegion.value.start + viewRegion.value.end) / 2)
    const half = Math.floor(newSpan / 2)
    setRegion({
      chr: viewRegion.value.chr,
      start: Math.max(1, center - half),
      end: Math.min(currentChromosomeSize.value, center + half)
    })
  }

  function panLeft(fraction = 0.25) {
    const shift = Math.floor(regionSpan.value * fraction)
    const start = Math.max(1, viewRegion.value.start - shift)
    const end = start + regionSpan.value - 1
    setRegion({ chr: viewRegion.value.chr, start, end })
  }

  function panRight(fraction = 0.25) {
    const shift = Math.floor(regionSpan.value * fraction)
    const maxChr = currentChromosomeSize.value
    const end = Math.min(maxChr, viewRegion.value.end + shift)
    const start = Math.max(1, end - regionSpan.value + 1)
    setRegion({ chr: viewRegion.value.chr, start, end })
  }

  async function jumpToGene(geneInput: any): Promise<boolean> {
    if (!geneInput || (typeof Event !== 'undefined' && geneInput instanceof Event)) {
      return false
    }

    // 1. Check if passed a gene locus object { chr, start, end }
    if (typeof geneInput === 'object' && geneInput !== null && 'chr' in geneInput && 'start' in geneInput && 'end' in geneInput) {
      const start = Number(geneInput.start)
      const end = Number(geneInput.end)
      if (!isNaN(start) && !isNaN(end)) {
        const geneSize = Math.max(100, end - start)
        const flank = Math.max(2000, Math.floor(geneSize * 0.2))
        setRegion({
          chr: String(geneInput.chr),
          start: Math.max(1, start - flank),
          end: end + flank
        })
        return true
      }
    }

    // 2. Check if passed a string gene name
    if (typeof geneInput !== 'string') {
      return false
    }

    const geneName = geneInput.trim()
    if (!geneName) return false

    // Check local sample list first
    const localGene = SAMPLE_GENES.find(g => g && g.name && String(g.name).toUpperCase() === geneName.toUpperCase())
    if (localGene) {
      const geneSize = Math.max(100, localGene.end - localGene.start)
      const flank = Math.max(2000, Math.floor(geneSize * 0.2))
      setRegion({
        chr: localGene.chr,
        start: Math.max(1, localGene.start - flank),
        end: localGene.end + flank
      })
      return true
    }

    // Try online search via MyGene API
    const results = await searchGeneByName(geneName, currentGenome.value.species)
    if (results.length > 0) {
      const g = results[0]
      const geneSize = Math.max(100, g.end - g.start)
      const flank = Math.max(2000, Math.floor(geneSize * 0.2))
      setRegion({
        chr: g.chr,
        start: Math.max(1, g.start - flank),
        end: g.end + flank
      })
      return true
    }

    return false
  }

  function canUndo() {
    return historyIndex.value > 0
  }

  function canRedo() {
    return historyIndex.value < history.value.length - 1
  }

  function undo() {
    if (canUndo()) {
      historyIndex.value--
      setRegion(history.value[historyIndex.value], false)
    }
  }

  function redo() {
    if (canRedo()) {
      historyIndex.value++
      setRegion(history.value[historyIndex.value], false)
    }
  }

  return {
    currentGenome,
    viewRegion,
    allGenomes: ALL_GENOMES,
    regionString,
    regionSpan,
    currentChromosomeSize,
    getChrSize,
    setGenome,
    setRegion,
    zoomIn,
    zoomOut,
    panLeft,
    panRight,
    jumpToGene,
    canUndo,
    canRedo,
    undo,
    redo
  }
})
