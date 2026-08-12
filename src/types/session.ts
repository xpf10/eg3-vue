import { Track } from './track'
import { GenomicRegion } from './region'

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  genomeName: string
  viewRegion: GenomicRegion
  tracks: Track[]
  description?: string
}

export interface Bookmark {
  id: string
  name: string
  genome: string
  region: GenomicRegion
  createdAt: string
}
