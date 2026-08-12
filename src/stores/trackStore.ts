import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { Track, TrackOptions } from '../types/track'
import { DEFAULT_TRACKS, CATALOG_TRACKS } from '../data/sampleTracks'

export const useTrackStore = defineStore('track', () => {
  const tracks = ref<Track[]>(JSON.parse(JSON.stringify(DEFAULT_TRACKS)))
  const selectedTrackId = ref<string | null>(null)
  const facetFilter = ref<Record<string, string[]>>({})
  const searchTerm = ref<string>('')

  const visibleTracks = computed(() => tracks.value.filter(t => t.visible !== false))

  const selectedTrack = computed(() => tracks.value.find(t => t.id === selectedTrackId.value) || null)

  const availableAssays = computed(() => {
    const assays = new Set<string>()
    CATALOG_TRACKS.forEach(t => {
      if (t.metadata?.assay) assays.add(t.metadata.assay)
    })
    return Array.from(assays)
  })

  const availableCells = computed(() => {
    const cells = new Set<string>()
    CATALOG_TRACKS.forEach(t => {
      if (t.metadata?.cell) cells.add(t.metadata.cell)
    })
    return Array.from(cells)
  })

  function addTrack(track: Track): Track {
    const uniqueId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const newTrack: Track = {
      ...JSON.parse(JSON.stringify(track)),
      id: uniqueId,
      items: track.items ? [...track.items] : undefined,
      rawContent: track.rawContent,
      bwInstance: track.bwInstance ? markRaw(track.bwInstance) : undefined,
      visible: true,
      options: {
        color: track.options?.color || '#38bdf8',
        height: track.options?.height || 60,
        displayMode: track.options?.displayMode || 'full',
        scaleType: track.options?.scaleType || 'auto',
        ...track.options
      }
    }
    tracks.value.push(newTrack)
    return newTrack
  }

  function removeTrack(trackId: string) {
    tracks.value = tracks.value.filter(t => t.id !== trackId)
    if (selectedTrackId.value === trackId) {
      selectedTrackId.value = null
    }
  }

  function updateTrackOptions(trackId: string, options: Partial<TrackOptions>) {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.options = { ...track.options, ...options }
    }
  }

  function toggleTrackVisibility(trackId: string) {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.visible = track.visible === false ? true : false
    }
  }

  function togglePinTrack(trackId: string) {
    const track = tracks.value.find(t => t.id === trackId)
    if (track) {
      track.pinned = !track.pinned
      // Sort pinned tracks to top
      tracks.value.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    }
  }

  function moveTrack(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= tracks.value.length) return
    if (toIndex < 0 || toIndex >= tracks.value.length) return
    const [moved] = tracks.value.splice(fromIndex, 1)
    tracks.value.splice(toIndex, 0, moved)
  }

  function resetTracksToDefault() {
    tracks.value = JSON.parse(JSON.stringify(DEFAULT_TRACKS))
    selectedTrackId.value = null
  }

  return {
    tracks,
    visibleTracks,
    selectedTrackId,
    selectedTrack,
    catalogTracks: CATALOG_TRACKS,
    facetFilter,
    searchTerm,
    availableAssays,
    availableCells,
    addTrack,
    removeTrack,
    updateTrackOptions,
    toggleTrackVisibility,
    togglePinTrack,
    moveTrack,
    resetTracksToDefault
  }
})
