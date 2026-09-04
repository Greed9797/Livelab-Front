import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { getAssiduidade } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asArray, asNumber, asString } from '../../utils/format'
import { formatHoras } from '../../utils/dailyPulse'
import type { JsonRecord } from '../../types/models'

export type AssiduidadeStatus = 'verde' | 'amarelo' | 'vermelho' | 'cinza'
export type TipoDeDia = 'util' | 'fim_de_semana' | 'feriado'

/**
 * Fallback dos limiares. O payload traz `metas.dia_util_horas` e `metas.folga_horas`, e é dele
 * que a legenda e os tooltips leem — quem classifica é o backend, então quem nomeia o número
 * também tem que ser ele, senão mudar o limiar lá deixaria a legenda aqui mentindo.
 *
 * Estes valores só entram quando o payload não traz o campo (backend antigo ainda no ar durante
 * a janela de deploy). Erram na direção segura: são os mesmos números que o servidor usa hoje.
 */
export const META_DIA_UTIL_HORAS = 5.5
export const META_FOLGA_HORAS = 4

export interface MetasAssiduidade {
  diaUtil: number
  folga: number
}

export function lerMetas(payload: unknown): MetasAssiduidade {
  const metas = ((payload ?? {}) as JsonRecord).metas as JsonRecord | undefined
  const diaUtil = asNumber(metas?.dia_util_horas)
  const folga = asNumber(metas?.folga_horas)
  return {
    diaUtil: diaUtil > 0 ? diaUtil : META_DIA_UTIL_HORAS,
    folga: folga > 0 ? folga : META_FOLGA_HORAS,
  }
}

/**
 * Cor NÃO pode ser o único canal. Medido nos tokens deste projeto: no tema escuro --success e
 * --warning têm contraste de 1.01:1 ENTRE SI (1.11:1 sob deuteranopia) e no claro --success vs
 * --danger cai para 1.08:1 sob deuteranopia — exatamente as duas adjacências que uma fileira de
 * palitinhos produz. Por isso cada status também tem ALTURA própria: a silhueta é legível antes
 * de qualquer cor, e o `rotulo` carrega a mesma informação em texto na legenda e no tooltip.
 */
export const ASSIDUIDADE_META: Record<AssiduidadeStatus, { rotulo: string; cor: string; alturaPct: number }> = {
  verde: { rotulo: 'Meta batida', cor: 'var(--success)', alturaPct: 100 },
  amarelo: { rotulo: 'Abaixo da meta', cor: 'var(--warning)', alturaPct: 52 },
  vermelho: { rotulo: 'Falta', cor: 'var(--danger)', alturaPct: 22 },
  cinza: { rotulo: 'Folga (fim de semana ou feriado)', cor: 'var(--text-faint)', alturaPct: 9 },
}

const ORDEM_LEGENDA: AssiduidadeStatus[] = ['verde', 'amarelo', 'vermelho', 'cinza']
const STATUS_VALIDOS: AssiduidadeStatus[] = ['verde', 'amarelo', 'vermelho', 'cinza']
const TIPOS_VALIDOS: TipoDeDia[] = ['util', 'fim_de_semana', 'feriado']
const NOMES_DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Dia da semana de uma data 'YYYY-MM-DD', em UTC puro.
 *
 * A string JÁ É o dia-calendário de São Paulo (o backend carimba com AT TIME ZONE). Reparsear com
 * `new Date(iso)` a interpretaria como meia-noite UTC e devolveria o dia ANTERIOR em qualquer
 * fuso a oeste — é o mesmo bug que já trocou segunda por domingo neste produto.
 */
export function diaDaSemana(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  if (!ano || !mes || !dia) return ''
  return NOMES_DIA_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()] ?? ''
}

/** Soma dias a 'YYYY-MM-DD' sem tocar em fuso — mesma aritmética do calendário do backend. */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(ano, mes - 1, dia) + dias * 86_400_000)
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}

function metaLabel(horas: number): string {
  return `${horas.toLocaleString('pt-BR')}h`
}

export interface DiaAssiduidade {
  data: string
  horas: number
  status: AssiduidadeStatus
  tipo: TipoDeDia
  feriado: string | null
}

export interface LinhaAssiduidade {
  id: string
  nome: string
  dias: DiaAssiduidade[]
  faltas: number
}

/**
 * Texto do title/aria-label de cada palitinho. É o canal que não depende de cor nenhuma: diz a
 * data, quanto ela ficou no ar e sobretudo POR QUE aquele dia é ou não cobrado — um cinza sem o
 * nome do feriado é indistinguível de um bug.
 */
export function descreverDia(dia: DiaAssiduidade, metas: MetasAssiduidade = { diaUtil: META_DIA_UTIL_HORAS, folga: META_FOLGA_HORAS }): string {
  const quando = `${diaDaSemana(dia.data)} ${dia.data.split('-').reverse().join('/')}`.trim()
  const horas = formatHoras(dia.horas)
  const veio = dia.horas > 0

  if (dia.tipo === 'feriado') {
    const nome = dia.feriado ? `Feriado: ${dia.feriado}` : 'Feriado'
    if (!veio) return `${quando} · ${horas} · ${nome} — folga, não é cobrado`
    const bateu = dia.status === 'verde' ? 'meta batida' : 'abaixo da meta'
    return `${quando} · ${horas} · ${nome} — trabalhou, ${bateu} de ${metaLabel(metas.folga)}`
  }

  if (dia.tipo === 'fim_de_semana') {
    if (!veio) return `${quando} · ${horas} · fim de semana — folga, não é cobrado`
    const bateu = dia.status === 'verde' ? 'meta batida' : 'abaixo da meta'
    return `${quando} · ${horas} · fim de semana — ${bateu} de ${metaLabel(metas.folga)}`
  }

  if (!veio) return `${quando} · ${horas} · dia útil — falta`
  const bateu = dia.status === 'verde' ? 'meta batida' : 'abaixo da meta'
  return `${quando} · ${horas} · dia útil — ${bateu} de ${metaLabel(metas.diaUtil)}`
}

/**
 * Junta as duas metades da resposta: `dias` (topo) traz tipo/feriado do calendário e cada
 * apresentadora traz horas/status.
 *
 * O casamento é por DATA, nunca por índice: alinhar por posição pintaria o feriado no dia errado
 * se o backend um dia devolver a janela em outra ordem. Status desconhecido cai em 'cinza' de
 * propósito — o erro barato é deixar de cobrar, não acusar falta de quem não faltou.
 */
export function buildAssiduidade(payload: unknown): { inicio: string; fim: string; linhas: LinhaAssiduidade[] } {
  const raw = (payload ?? {}) as JsonRecord

  const calendario = new Map<string, { tipo: TipoDeDia; feriado: string | null }>()
  for (const d of asArray<JsonRecord>(raw.dias)) {
    const data = asString(d.data, '')
    if (!data) continue
    calendario.set(data, {
      tipo: TIPOS_VALIDOS.includes(d.tipo as TipoDeDia) ? (d.tipo as TipoDeDia) : 'util',
      feriado: typeof d.feriado === 'string' && d.feriado.trim() ? d.feriado : null,
    })
  }

  const linhas = asArray<JsonRecord>(raw.apresentadoras).map((a): LinhaAssiduidade => {
    const dias = asArray<JsonRecord>(a.dias).map((d): DiaAssiduidade => {
      const data = asString(d.data, '')
      const cal = calendario.get(data)
      return {
        data,
        horas: asNumber(d.horas),
        status: STATUS_VALIDOS.includes(d.status as AssiduidadeStatus) ? (d.status as AssiduidadeStatus) : 'cinza',
        tipo: cal?.tipo ?? 'util',
        feriado: cal?.feriado ?? null,
      }
    })
    return {
      id: asString(a.id, ''),
      nome: asString(a.nome, 'Sem nome'),
      dias,
      // Contado sobre os dias efetivamente pintados, não sobre `resumo` do payload: o número na
      // tela tem que ser o que a fileira ao lado mostra.
      faltas: dias.filter((d) => d.status === 'vermelho').length,
    }
  })

  return { inicio: asString(raw.inicio, ''), fim: asString(raw.fim, ''), linhas }
}

/** Palitinho — mesma silhueta na fileira e na legenda, para o olho mapear um no outro. */
function Palito({ status, altura, label }: { status: AssiduidadeStatus; altura: number; label?: string }) {
  const meta = ASSIDUIDADE_META[status]
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className="w-[9px] shrink-0 rounded-[2px]"
      style={{
        height: `${Math.max(3, Math.round((altura * meta.alturaPct) / 100))}px`,
        background: meta.cor,
        // Borda de 1px em TODO palitinho: --warning sobre card branco dá 2.69:1, abaixo do mínimo
        // de 3:1 do WCAG 1.4.11 para elemento gráfico que carrega informação. A borda devolve o
        // recorte da forma sem mexer na cor.
        border: '1px solid color-mix(in srgb, var(--text-primary) 22%, transparent)',
      }}
    />
  )
}

interface AssiduidadeStripProps {
  /** 'YYYY-MM-DD'. Omitido = últimos 30 dias, escolhidos pelo backend. */
  inicio?: string
  fim?: string
  /** Quando setado, mostra só essa apresentadora — para a tela que já filtra por entidade. */
  apresentadoraId?: string
  titulo?: string
  subtitulo?: string
}

export function AssiduidadeStrip({
  inicio,
  fim,
  apresentadoraId,
  titulo = 'Assiduidade das apresentadoras',
  subtitulo,
}: AssiduidadeStripProps) {
  const query = useQuery({
    queryKey: ['assiduidade', inicio ?? 'auto', fim ?? 'auto'],
    queryFn: () => getAssiduidade({ inicio, fim }),
    staleTime: 60_000,
    // Mesma política da Home: uma falha de refetch em background não pode apagar a fileira que
    // já está na tela.
    placeholderData: (prev) => prev,
  })

  const dados = useMemo(() => buildAssiduidade(query.data), [query.data])
  // Limiares vêm do servidor: quem classifica é quem nomeia o número.
  const metas = useMemo(() => lerMetas(query.data), [query.data])
  // Marca NUNCA filtra aqui (e o endpoint nem aceita marca_id): presença é física, não pertence a
  // marca. Filtrar por marca faria sumir quem naquele dia fez live de outra — vermelho falso.
  const linhas = apresentadoraId ? dados.linhas.filter((l) => l.id === apresentadoraId) : dados.linhas

  const periodo = dados.inicio && dados.fim
    ? `${dados.inicio.split('-').reverse().join('/')} → ${dados.fim.split('-').reverse().join('/')}`
    : ''

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <p className="text-base font-bold text-ink">{titulo}</p>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {subtitulo ?? 'Um palitinho por dia — altura e cor mostram quanto tempo ela ficou no ar.'}
              {periodo ? ` · ${periodo}` : ''}
            </p>
          </div>

          {/* A legenda é o que traduz a cor — e a altura — para quem não distingue as duas.
              Sempre visível, nunca escondida atrás de hover. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            {ORDEM_LEGENDA.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className="flex h-[14px] items-end">
                  <Palito status={status} altura={14} />
                </span>
                {ASSIDUIDADE_META[status].rotulo}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Meta: <strong className="text-ink">{metaLabel(metas.diaUtil)}</strong> em dia útil ·{' '}
          <strong className="text-ink">{metaLabel(metas.folga)}</strong> em fim de semana e feriado.
          Feriado nunca conta como falta — nem nacional, nem de Blumenau.
        </p>
      </CardHeader>

      <CardBody>
        {query.isLoading ? (
          <LoadingState label="Levantando presença das apresentadoras" />
        ) : query.isError && !query.data ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : linhas.length === 0 ? (
          <EmptyState
            title="Sem apresentadoras no período"
            description="Nenhuma apresentadora ativa nem live encerrada na janela selecionada."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <div className="w-max min-w-full space-y-2">
              {linhas.map((linha) => (
                <div key={linha.id} className="flex items-stretch gap-3">
                  {/* Nome fica colado à esquerda no scroll horizontal: uma fileira de 90 dias sem
                      âncora vira uma linha de cores de dono desconhecido. Ele é opaco e os
                      palitinhos passam por baixo — daí items-stretch na linha: sem ocupar a
                      altura toda, sobraria uma fatia de cor aparecendo acima e abaixo do texto. */}
                  <div
                    className="sticky left-0 z-10 flex w-[170px] shrink-0 flex-col justify-center pr-3"
                    style={{ background: 'var(--bg-elev-1)' }}
                  >
                    <span className="truncate text-xs font-bold text-ink" title={linha.nome}>
                      {linha.nome}
                    </span>
                    <span
                      className="num text-[10px] font-bold"
                      style={{ color: linha.faltas > 0 ? 'var(--danger)' : 'var(--text-muted)' }}
                    >
                      {linha.faltas > 0
                        ? `${linha.faltas} ${linha.faltas === 1 ? 'falta' : 'faltas'}`
                        : 'sem faltas'}
                    </span>
                  </div>

                  <div
                    className="flex items-end gap-[2px]"
                    style={{ height: 32 }}
                    role="group"
                    aria-label={`Assiduidade de ${linha.nome}: ${linha.dias.length} dias, ${linha.faltas} falta(s)`}
                  >
                    {linha.dias.map((dia) => (
                      <Palito key={dia.data} status={dia.status} altura={32} label={descreverDia(dia, metas)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
