import { describe, it, expect } from 'vitest'
import { serializeTracks } from '../sessionStore'
import type { Track } from '../../types/track'

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 't1',
    name: 'Track',
    type: 'bigwig',
    options: { color: '#fff' },
    ...overrides
  }
}

describe('serializeTracks', () => {
  it('strips bwInstance and rawContent from every track', () => {
    const tracks = serializeTracks([
      makeTrack({ bwInstance: { getHeader: () => Promise.resolve({}), getFeatures: () => Promise.resolve([]) } as any, rawContent: new ArrayBuffer(8) })
    ])
    expect(tracks[0].bwInstance).toBeUndefined()
    expect(tracks[0].rawContent).toBeUndefined()
  })

  it('resets loadStatus for remote tracks so the renderer reconnects', () => {
    const tracks = serializeTracks([
      makeTrack({ url: 'https://example.com/x.bw', loadStatus: 'ok' }),
      makeTrack({ url: 'https://example.com/y.bw', loadStatus: 'failed' })
    ])
    expect(tracks[0].loadStatus).toBeUndefined()
    expect(tracks[1].loadStatus).toBeUndefined()
  })

  it('keeps local parsed items as ok', () => {
    const tracks = serializeTracks([
      makeTrack({ url: 'local://abc', type: 'bed', loadStatus: 'ok', items: [{ chr: 'chr1', start: 1, end: 2 }] })
    ])
    expect(tracks[0].loadStatus).toBe('ok')
    expect(tracks[0].items).toHaveLength(1)
  })

  it('marks un-restorable local binary payloads as simulated', () => {
    const tracks = serializeTracks([
      makeTrack({ url: 'local://abc', type: 'bam', loadStatus: 'ok', rawContent: new ArrayBuffer(8) })
    ])
    expect(tracks[0].loadStatus).toBe('simulated')
  })

  it('is idempotent', () => {
    const input = [makeTrack({ url: 'https://example.com/x.bw', loadStatus: 'ok', bwInstance: {} as any })]
    const once = serializeTracks(input)
    const twice = serializeTracks(once)
    expect(twice).toEqual(once)
  })
})
