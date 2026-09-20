import { ExternalLink, Play } from 'lucide-react'
import { knowledgeVideoEmbed, safeExternalUrl, type KnowledgeMaterial } from '../../services/knowledge'

export function KnowledgeVideoEmbed({ material }: { material: Pick<KnowledgeMaterial, 'video_provider' | 'video_id' | 'video_url' | 'titulo'> }) {
  const embed = knowledgeVideoEmbed(material)
  const fallback = embed?.watchUrl ?? safeExternalUrl(material.video_url)
  if (!embed && !fallback) return null
  if (!embed && fallback) {
    return (
      <a
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
        href={fallback}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Abrir vídeo em outra aba
      </a>
    )
  }
  return (
    <figure className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
        <iframe
          title={`Vídeo: ${material.titulo ?? 'aula'}`}
          src={embed!.embedUrl}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {fallback ? (
        <a
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-2 hover:underline"
          href={fallback}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Abrir no provedor se o player não carregar
        </a>
      ) : null}
    </figure>
  )
}
