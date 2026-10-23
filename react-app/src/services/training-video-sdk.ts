export interface YouTubePlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlaybackRate(): number
  getPlayerState(): number
  cueVideoById(options: { videoId: string; startSeconds?: number }): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  destroy(): void
}

export interface YouTubeApi {
  Player: new (
    target: HTMLIFrameElement,
    options: { events: { onReady?: (event: { target: YouTubePlayer }) => void; onStateChange?: (event: { data: number; target: YouTubePlayer }) => void; onError?: () => void } },
  ) => YouTubePlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number }
}

export interface PandaPlayerInstance {
  getCurrentTime(): number
  getDuration(): number
  getSpeed?(): number
  setCurrentTime(seconds: number): void
  isPaused(): boolean
  onEvent(callback: (event: unknown) => void): void
  destroy(): void
}

interface PandaPlayerConstructor {
  new (hostId: string, options: {
    video_id?: string
    library_id?: string
    onReady?: () => void
    onError?: (error: unknown) => void
  }): PandaPlayerInstance
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
    PandaPlayer?: PandaPlayerConstructor
    pandascripttag?: Array<() => void>
  }
}

let youtubeLoad: Promise<YouTubeApi> | null = null
let pandaLoad: Promise<PandaPlayerConstructor> | null = null

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeLoad) return youtubeLoad
  youtubeLoad = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube Player API did not initialize.'))
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    const script = existing ?? document.createElement('script')
    script.onerror = () => {
      script.remove()
      reject(new Error('YouTube Player API failed to load.'))
    }
    if (!existing) {
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }
  }).catch((error) => {
    youtubeLoad = null
    throw error
  })
  return youtubeLoad
}

export function loadPandaApi(): Promise<PandaPlayerConstructor> {
  if (window.PandaPlayer) return Promise.resolve(window.PandaPlayer)
  if (pandaLoad) return pandaLoad
  pandaLoad = new Promise<PandaPlayerConstructor>((resolve, reject) => {
    window.pandascripttag = window.pandascripttag ?? []
    window.pandascripttag.push(() => {
      if (window.PandaPlayer) resolve(window.PandaPlayer)
      else reject(new Error('Panda Player API did not initialize.'))
    })
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://player.pandavideo.com.br/api.v2.js"]')
    const script = existing ?? document.createElement('script')
    script.onerror = () => {
      script.remove()
      reject(new Error('Panda Player API failed to load.'))
    }
    if (!existing) {
      script.src = 'https://player.pandavideo.com.br/api.v2.js'
      script.async = true
      document.head.appendChild(script)
    }
  }).catch((error) => {
    pandaLoad = null
    throw error
  })
  return pandaLoad
}
