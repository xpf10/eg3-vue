import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Session, Bookmark } from '../types/session'
import { useGenomeStore } from './genomeStore'
import { useTrackStore } from './trackStore'
import { formatGenomicRegion } from '../types/region'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const bookmarks = ref<Bookmark[]>([])
  const currentSessionId = ref<string | null>(null)

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
  }

  function persist() {
    try {
      localStorage.setItem('eg3_vue_sessions', JSON.stringify(sessions.value))
      localStorage.setItem('eg3_vue_bookmarks', JSON.stringify(bookmarks.value))
    } catch (e) {
      console.warn('Failed to save to localStorage', e)
    }
  }

  function saveCurrentSession(name: string, description?: string): Session {
    const genomeStore = useGenomeStore()
    const trackStore = useTrackStore()

    const newSession: Session = {
      id: `session-${Date.now()}`,
      name: name || `Session ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      genomeName: genomeStore.currentGenome.name,
      viewRegion: { ...genomeStore.viewRegion },
      tracks: JSON.parse(JSON.stringify(trackStore.tracks)),
      description
    }

    sessions.value.unshift(newSession)
    currentSessionId.value = newSession.id
    persist()
    return newSession
  }

  function loadSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false

    const genomeStore = useGenomeStore()
    const trackStore = useTrackStore()

    genomeStore.setGenome(session.genomeName)
    genomeStore.setRegion(session.viewRegion)
    trackStore.tracks = JSON.parse(JSON.stringify(session.tracks))

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
      tracks: trackStore.tracks
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
      trackStore.tracks = data.tracks
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
    saveCurrentSession,
    loadSession,
    deleteSession,
    exportSessionJSON,
    importSessionJSON,
    addBookmark,
    removeBookmark
  }
})
