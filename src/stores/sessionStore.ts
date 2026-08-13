import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Session, Bookmark } from '../types/session'
import { Track } from '../types/track'
import { useGenomeStore } from './genomeStore'
import { useTrackStore } from './trackStore'

/**
 * A session may only contain JSON-serializable data.  Non-serializable track
 * payloads (`bwInstance`, `rawContent` ArrayBuffers) are stripped here; remote
 * BigWig URLs are marked `loadStatus: undefined` so the renderer lazily
 * reconnects them on load.
 *
 * Local-only payloads that cannot be restored (local BigWig/BAM/VCF binary
 * content) are marked `simulated` so the UI shows the honest badge instead of
 * silently drawing fake data.
 */
export function serializeTracks(tracks: Track[]): Track[] {
  return tracks.map(t => {
    const copy: Track = {
      ...t,
      bwInstance: undefined,
      rawContent: undefined
    }

    if (t.url && t.url.startsWith('local://')) {
      if (copy.items && Array.isArray(copy.items) && copy.items.length > 0) {
        copy.loadStatus = 'ok' // parsed BED/GFF items survive JSON round-trip
      } else {
        copy.loadStatus = 'simulated' // binary local payloads are not restorable
      }
    } else {
      // Remote track: drop the status so the renderer reconnects (BigWig) or
      // falls back to an honest simulated badge (BAM/VCF/… without a parser).
      copy.loadStatus = undefined
    }
    return copy
  })
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const bookmarks = ref<Bookmark[]>([])
  const currentSessionId = ref<string | null>(null)
  /** Last localStorage write failure (e.g. quota exceeded), surfaced in the UI. */
  const persistError = ref<string | null>(null)

  // Initialize from LocalStorage if available
  try {
    const savedSessions = localStorage.getItem('eg3_vue_sessions')
    if (savedSessions) {
      sessions.value = JSON.parse(savedSessions)
    }
    const savedBookmarks = localStorage.getItem('eg3_vue_bookmarks')
    if (savedBookmarks) {
      bookmarks.value = JSON.parse(savedBookmarks)
    }
  } catch (e) {
    console.warn('LocalStorage not available', e)
    persistError.value = 'LocalStorage is not available — sessions will not persist across reloads.'
  }

  function persist(): boolean {
    try {
      localStorage.setItem('eg3_vue_sessions', JSON.stringify(sessions.value))
      localStorage.setItem('eg3_vue_bookmarks', JSON.stringify(bookmarks.value))
      persistError.value = null
      return true
    } catch (e) {
      const msg = e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'Storage quota exceeded — the session contains too much data to save locally. Remove old sessions or export to JSON instead.'
        : `Failed to save to localStorage: ${e instanceof Error ? e.message : String(e)}`
      console.warn('Failed to save to localStorage', e)
      persistError.value = msg
      return false
    }
  }

  function saveCurrentSession(name: string, description?: string): Session | null {
    const genomeStore = useGenomeStore()
    const trackStore = useTrackStore()

    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: name || `Session ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      genomeName: genomeStore.currentGenome.name,
      viewRegion: { ...genomeStore.viewRegion },
      tracks: serializeTracks(trackStore.tracks),
      description
    }

    sessions.value.unshift(newSession)
    currentSessionId.value = newSession.id
    if (!persist()) {
      // Roll back the in-memory entry so the UI does not show a session that
      // never made it to disk.
      sessions.value = sessions.value.filter(s => s.id !== newSession.id)
      return null
    }
    return newSession
  }

  function loadSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false

    const genomeStore = useGenomeStore()
    const trackStore = useTrackStore()

    genomeStore.setGenome(session.genomeName)
    genomeStore.setRegion(session.viewRegion)
    // serializeTracks normalises statuses so remote BigWigs reconnect lazily
    // and un-restorable local payloads show the simulated badge.
    trackStore.tracks = serializeTracks(JSON.parse(JSON.stringify(session.tracks)))

    currentSessionId.value = session.id
    return true
  }

  function deleteSession(sessionId: string) {
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null
    }
    persist()
  }

  function exportSessionJSON(): string {
    const genomeStore = useGenomeStore()
    const trackStore = useTrackStore()

    const exportData = {
      version: '3.0.0-vue',
      exportedAt: new Date().toISOString(),
      genomeName: genomeStore.currentGenome.name,
      viewRegion: genomeStore.viewRegion,
      tracks: serializeTracks(trackStore.tracks)
    }
    return JSON.stringify(exportData, null, 2)
  }

  function importSessionJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr)
      if (!data.genomeName || !data.viewRegion || !Array.isArray(data.tracks)) {
        throw new Error('Invalid session file format')
      }
      const genomeStore = useGenomeStore()
      const trackStore = useTrackStore()

      genomeStore.setGenome(data.genomeName)
      genomeStore.setRegion(data.viewRegion)
      trackStore.tracks = serializeTracks(data.tracks as Track[])
      return true
    } catch (e) {
      console.error('Import failed', e)
      return false
    }
  }

  function addBookmark(name?: string) {
    const genomeStore = useGenomeStore()
    const reg = genomeStore.viewRegion
    const bmName = name || `${reg.chr}:${reg.start}-${reg.end}`

    const newBm: Bookmark = {
      id: `bm-${Date.now()}`,
      name: bmName,
      genome: genomeStore.currentGenome.name,
      region: { ...reg },
      createdAt: new Date().toISOString()
    }
    bookmarks.value.unshift(newBm)
    persist()
  }

  function removeBookmark(id: string) {
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    persist()
  }

  return {
    sessions,
    bookmarks,
    currentSessionId,
    persistError,
    saveCurrentSession,
    loadSession,
    deleteSession,
    exportSessionJSON,
    importSessionJSON,
    addBookmark,
    removeBookmark
  }
})
