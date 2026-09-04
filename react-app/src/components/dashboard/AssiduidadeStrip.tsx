import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState, ErrorState, LoadingState } from '../ui/States'
import { getAssiduidade } from '../../services/domain'
import { extractErrorMessage } from '../../services/api'
import { asArray, asNumber, asString } from '../../utils/format'
import { formatHoras } from '../../utils/dailyPulse'
import { getSaoPauloDateInput, somarDias } from '../../utils/sao-paulo-date'
import type { JsonRecord } from '../../types/models'

export type AssiduidadeStatus = 'verde' | 'amarelo' | 'vermelho' | 'cinza' | 'em_curso'

/**
 * Tipos de dia que a tela entende.
 *
 * `util` é o ÚNICO que pode virar vermelho — os outros quatro são neutros por construção.
 * `em_curso` é o dia que ainda não terminou (o backend passou a marcá-lo; ver `normalizarTipo`)
 * e `nao_cobrado` é o guarda-chuva de tudo que o backend disser que não se cobra daquela pessoa
 * naquele dia (fora do vínculo, antes da admissão, depois do desligamento) — inclusive rótulos
 * que este front ainda não conhece.
 */
export type TipoDeDia = 'util' | 'fim_de_semana' | 'feriado' | 'em_curso' | 'nao_cobrado'

/** Tipos de dia herdados do calendário — só estes três existiam no primeiro contrato. */
const TIPOS_CALENDARIO: TipoDeDia[] = ['util', 'fim_de_semana', 'feriado']

/**
 * Rótulos que o backend pode usar para "o dia ainda está acontecendo". O contrato combinado fala
 * em 'em_curso'/'parcial'; aceitar os três aliases custa uma linha e evita que um nome diferente
 * caia no ramo genérico e perca a frase certa no tooltip.
 */
const TIPOS_EM_CURSO = new Set(['em_curso', 'parcial', 'em_andamento'])

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

/**
 * Teto de janela do endpoint (mesmo número do backend: ASSIDUIDADE_JANELA_MAX_DIAS). Pedir mais
 * que isso devolve 400 e a tira inteira vira um bloco de erro no meio de uma página que carregou
 * bem. Preferimos recortar a janela e DIZER que recortamos.
 */
export const JANELA_MAX_DIAS = 366

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
  em_curso: { rotulo: 'Dia em curso (ainda não terminou)', cor: 'var(--info)', alturaPct: 34 },
  vermelho: { rotulo: 'Falta', cor: 'var(--danger)', alturaPct: 22 },
  // Cinza cobre folga E dia fora do vínculo: nos dois casos a pessoa não é cobrada, e o rótulo
  // precisa dizer isso — 'folga' sozinho faria o dia pré-admissão parecer classificação errada.
  cinza: { rotulo: 'Não cobrado (folga ou fora do vínculo)', cor: 'var(--text-faint)', alturaPct: 9 },
}

const ORDEM_LEGENDA: AssiduidadeStatus[] = ['verde', 'amarelo', 'em_curso', 'vermelho', 'cinza']
const STATUS_VALIDOS: AssiduidadeStatus[] = ['verde', 'amarelo', 'vermelho', 'cinza', 'em_curso']
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

/**
 * Soma dias a 'YYYY-MM-DD' — mesma aritmética do calendário do backend. Mora em utils porque a
 * barra de filtros do Analytics precisa exatamente dela; re-exportado aqui porque a Home e os
 * testes desta tela já a importam por este caminho.
 */
export { somarDias }

/** '2026-09-01' → '01/09'. Formato curto, para caber na lista de faltas do nome. */
function diaCurto(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return mes && dia ? `${dia}/${mes}` : iso
}

function metaLabel(horas: number): string {
  return `${horas.toLocaleString('pt-BR')}h`
}

/**
 * Recorta a janela pedida ao teto do endpoint, ancorando no FIM (o passado distante é o que se
 * corta; o dia mais recente é o que interessa). Devolve `truncada` para a tela poder avisar em
 * vez de mentir sobre o período mostrado.
 */
export function limitarJanela(inicio?: string, fim?: string): { inicio?: string; fim?: string; truncada: boolean } {
  if (!inicio || !fim || inicio > fim) return { inicio, fim, truncada: false }
  const limite = somarDias(fim, -(JANELA_MAX_DIAS - 1))
  return inicio < limite ? { inicio: limite, fim, truncada: true } : { inicio, fim, truncada: false }
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
  /** Datas dos dias vermelhos, para a tela mostrar QUAIS foram sem depender de hover. */
  diasDeFalta: string[]
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

  // Dia que ainda não acabou não tem veredito: o que ele mostra é parcial, por definição.
  if (dia.tipo === 'em_curso') {
    return `${quando} · ${horas} até agora · dia em curso — ainda não terminou, não conta como falta`
  }

  // Dia em que a pessoa não era cobrada (fora do vínculo, antes da admissão, depois da saída) —
  // ou um tipo que este front não conhece. Nos dois casos: neutro, nunca falta.
  if (dia.tipo === 'nao_cobrado') {
    return `${quando} · ${horas} · fora do período cobrado — não conta como falta`
  }

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
 * Traduz o `tipo` que veio no payload para os cinco que a tela conhece.
 *
 * Duas travas, ambas na mesma direção — só o dia útil ENCERRADO pode ser cobrado:
 *
 * 1. Tipo desconhecido cai em `nao_cobrado`, NUNCA em `util`. Antes o default era `util`, o
 *    único tipo que vira vermelho: um rótulo novo do backend (o de fora-do-vínculo, por exemplo)
 *    chegava aqui e virava acusação de falta. Fallback tem que errar para o lado barato.
 * 2. Dia útil cuja data ainda não passou vira `em_curso` mesmo sem o backend dizer. Isso cobre o
 *    servidor antigo, que classifica hoje como dia útil comum: às 9h da manhã ninguém faltou
 *    ainda, e a live que está no ar só entra na conta quando alguém a encerra.
 */
export function normalizarTipo(bruto: unknown, data: string, hoje: string): TipoDeDia {
  const t = typeof bruto === 'string' ? bruto : ''
  if (TIPOS_EM_CURSO.has(t)) return 'em_curso'
  if (!TIPOS_CALENDARIO.includes(t as TipoDeDia)) return 'nao_cobrado'
  // Fim de semana/feriado de hoje já é neutro; só o dia útil precisa da proteção.
  if (t === 'util' && data >= hoje) return 'em_curso'
  return t as TipoDeDia
}

/**
 * Trava final: vermelho só sobrevive em dia útil encerrado.
 *
 * Se o backend mandar 'vermelho' num dia que ele mesmo marcou como folga, em curso ou fora do
 * vínculo, a incoerência é resolvida a favor da pessoa. Status desconhecido também cai em neutro
 * — o erro barato é deixar de cobrar, não acusar quem não faltou.
 */
export function normalizarStatus(bruto: unknown, tipo: TipoDeDia): AssiduidadeStatus {
  const s = STATUS_VALIDOS.includes(bruto as AssiduidadeStatus) ? (bruto as AssiduidadeStatus) : 'cinza'
  if (tipo === 'util') return s === 'em_curso' ? 'cinza' : s
  if (s !== 'vermelho') return s
  return tipo === 'em_curso' ? 'em_curso' : 'cinza'
}

/**
 * Junta as duas metades da resposta: `dias` (topo) traz tipo/feriado do calendário e cada
 * apresentadora traz horas/status.
 *
 * O casamento é por DATA, nunca por índice: alinhar por posição pintaria o feriado no dia errado
 * se o backend um dia devolver a janela em outra ordem. O `tipo` que vier DENTRO do dia da
 * apresentadora vence o do calendário: é por ali que chega o que é individual (fora do vínculo,
 * admissão no meio da janela) — o calendário do topo é o mesmo para todo mundo e não saberia
 * disso.
 */
export function buildAssiduidade(
  payload: unknown,
  hoje: string = getSaoPauloDateInput(),
): { inicio: string; fim: string; linhas: LinhaAssiduidade[] } {
  const raw = (payload ?? {}) as JsonRecord

  const calendario = new Map<string, { tipo: unknown; feriado: string | null }>()
  for (const d of asArray<JsonRecord>(raw.dias)) {
    const data = asString(d.data, '')
    if (!data) continue
    calendario.set(data, {
      tipo: d.tipo,
      feriado: typeof d.feriado === 'string' && d.feriado.trim() ? d.feriado : null,
    })
  }

  const linhas = asArray<JsonRecord>(raw.apresentadoras).map((a): LinhaAssiduidade => {
    const dias = asArray<JsonRecord>(a.dias).map((d): DiaAssiduidade => {
      const data = asString(d.data, '')
      const cal = calendario.get(data)
      // O backend pode anunciar "dia ainda em curso" pelo `tipo` do dia OU por um `status`
      // próprio — o contrato ficou em aberto nesse ponto. Os dois querem dizer a mesma coisa
      // aqui, então qualquer um dos dois campos serve de gatilho.
      const bruto = TIPOS_EM_CURSO.has(asString(d.status, '')) ? d.status : (d.tipo ?? cal?.tipo)
      const tipo = normalizarTipo(bruto, data, hoje)
      return {
        data,
        horas: asNumber(d.horas),
        status: normalizarStatus(d.status, tipo),
        tipo,
        feriado: cal?.feriado ?? null,
      }
    })
    // Contado sobre os dias efetivamente pintados, não sobre `resumo` do payload: o número na
    // tela tem que ser o que a fileira ao lado mostra. Depois da normalização, só dia útil
    // encerrado pode estar vermelho — dia em curso e dia fora do vínculo já saíram da conta.
    const diasDeFalta = dias.filter((d) => d.status === 'vermelho').map((d) => d.data)
    return {
      id: asString(a.id, ''),
      nome: asString(a.nome, 'Sem nome'),
      dias,
      faltas: diasDeFalta.length,
      diasDeFalta,
    }
  })

  return { inicio: asString(raw.inicio, ''), fim: asString(raw.fim, ''), linhas }
}

/**
 * A fileira só pode afirmar "sem faltas" sobre uma janela que existe.
 *
 * Janela invertida (início > fim, o que acontece quando o cliente pede um "hoje" que ainda não
 * chegou em São Paulo e o backend corta o fim em hoje) e linha sem nenhum dia produzem uma faixa
 * de 32px vazia ao lado do nome com o texto "sem faltas" — uma afirmação tranquilizadora sobre um
 * período que ninguém mediu. Isso é um estado vazio, não um resultado.
 */
export function janelaSemDias(dados: { inicio: string; fim: string; linhas: LinhaAssiduidade[] }): boolean {
  if (dados.inicio && dados.fim && dados.inicio > dados.fim) return true
  return dados.linhas.length > 0 && dados.linhas.every((l) => l.dias.length === 0)
}

function estiloPalito(status: AssiduidadeStatus, altura: number) {
  const meta = ASSIDUIDADE_META[status]
  return {
    height: `${Math.max(3, Math.round((altura * meta.alturaPct) / 100))}px`,
    background: meta.cor,
    // Borda de 1px em TODO palitinho: --warning sobre card branco dá 2.69:1, abaixo do mínimo
    // de 3:1 do WCAG 1.4.11 para elemento gráfico que carrega informação. A borda devolve o
    // recorte da forma sem mexer na cor.
    border: '1px solid color-mix(in srgb, var(--text-primary) 22%, transparent)',
  }
}

/**
 * Tooltip do hover. `position: fixed` NÃO é preciosismo: a fileira vive dentro de um
 * `overflow-x: auto` e um overlay `absolute` seria recortado pelo container no exato momento em
 * que o dia interessante está perto da borda. Fixed sai do fluxo e escapa do clip.
 *
 * Fica acima do palitinho, e cola nas bordas da viewport quando não cabe — o primeiro e o último
 * dia da fileira são justamente os mais consultados.
 */
function TooltipDia({ texto, rect }: { texto: string; rect: DOMRect }) {
  const MARGEM = 8
  const x = Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140)
  const acima = rect.top > 90
  return (
    <div
      role="presentation"
      className="pointer-events-none fixed z-50 max-w-[260px] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug"
      style={{
        left: x,
        top: acima ? rect.top - MARGEM : rect.bottom + MARGEM,
        transform: `translate(-50%, ${acima ? '-100%' : '0'})`,
        background: 'var(--bg-elev-3)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
        // Offset + blur de verdade: halo sem deslocamento é decoração, não profundidade.
        boxShadow: '0 4px 14px rgb(0 0 0 / 0.28)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {texto}
    </div>
  )
}

/** Palitinho decorativo da legenda — mesma silhueta da fileira, para o olho mapear um no outro. */
function Palito({ status, altura }: { status: AssiduidadeStatus; altura: number }) {
  return <span aria-hidden className="block w-[9px] shrink-0 rounded-[2px]" style={estiloPalito(status, altura)} />
}

/**
 * Palitinho da fileira: é um BOTÃO, não um span com `title`.
 *
 * `title` não existe em toque e não é alcançável por teclado — num tablet da operação a acusação
 * (a cor vermelha) ficava visível e a justificativa não. Como botão ele recebe foco, dispara o
 * `onFocus`/`onClick` que escreve o motivo na linha de leitura abaixo da fileira, e ainda ganha
 * área de toque de 32px de altura (a largura fica nos 9px que 366 dias exigem — por isso a lista
 * de faltas ao lado do nome existe: é o caminho de toque que não depende de acertar 9px).
 */
function PalitoDia({
  label,
  status,
  altura,
  id,
  tabbable,
  onSelecionar,
  onNavegar,
  onApontar,
}: {
  label: string
  status: AssiduidadeStatus
  altura: number
  id: string
  tabbable: boolean
  onSelecionar: () => void
  onNavegar: (passo: number | 'inicio' | 'fim') => void
  onApontar?: (rect: DOMRect | null) => void
}) {
  return (
    <button
      type="button"
      id={id}
      aria-label={label}
      title={label}
      tabIndex={tabbable ? 0 : -1}
      onFocus={onSelecionar}
      onClick={onSelecionar}
      // Hover mostra o dia na hora, junto do cursor. O `title` nativo até existia, mas o
      // navegador só o revela depois de ~1s e sem estilo — na prática o mouse parecia morto e
      // só restava clicar e desviar o olho para o painel lá embaixo.
      onMouseEnter={(e) => onApontar?.(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => onApontar?.(null)}
      onKeyDown={(e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? 'inicio' : e.key === 'End' ? 'fim' : null
        if (passo === null) return
        e.preventDefault()
        onNavegar(passo)
      }}
      className="flex w-[9px] shrink-0 cursor-pointer items-end bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      style={{ height: `${altura}px` }}
    >
      <span className="block w-full rounded-[2px]" style={estiloPalito(status, altura)} />
    </button>
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
  // Janela invertida nem chega a ser pedida: o backend responderia 400 (ou, quando ele mesmo
  // corta o fim em hoje, uma fileira vazia) e a tela viraria um bloco de erro sem explicação.
  const janelaInvertida = Boolean(inicio && fim && inicio > fim)
  const janela = limitarJanela(inicio, fim)

  const query = useQuery({
    queryKey: ['assiduidade', janela.inicio ?? 'auto', janela.fim ?? 'auto'],
    queryFn: () => getAssiduidade({ inicio: janela.inicio, fim: janela.fim }),
    enabled: !janelaInvertida,
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

  // Dia selecionado por clique/toque/teclado. É o que substitui o hover: o motivo do palitinho
  // aparece em texto, abaixo da fileira, num região aria-live que o leitor de tela anuncia.
  const [selecao, setSelecao] = useState<{ linhaId: string; indice: number } | null>(null)
  // Hover é um canal SEPARADO da seleção: apontar não pode alterar o que está fixado no painel
  // de leitura abaixo, senão passar o mouse pela fileira apagaria o dia que a pessoa clicou.
  const [apontado, setApontado] = useState<{ texto: string; rect: DOMRect } | null>(null)
  const linhaSelecionada = linhas.find((l) => l.id === selecao?.linhaId)
  const diaSelecionado = selecao ? linhaSelecionada?.dias[selecao.indice] : undefined

  const periodo = dados.inicio && dados.fim
    ? `${dados.inicio.split('-').reverse().join('/')} → ${dados.fim.split('-').reverse().join('/')}`
    : ''

  const vazio = janelaInvertida || janelaSemDias({ ...dados, linhas })

  function idPalito(linhaId: string, data: string) {
    return `palito-${linhaId}-${data}`
  }

  function navegar(linha: LinhaAssiduidade, atual: number, passo: number | 'inicio' | 'fim') {
    const ultimo = linha.dias.length - 1
    const alvo = passo === 'inicio' ? 0 : passo === 'fim' ? ultimo : Math.min(ultimo, Math.max(0, atual + passo))
    const dia = linha.dias[alvo]
    if (!dia) return
    setSelecao({ linhaId: linha.id, indice: alvo })
    document.getElementById(idPalito(linha.id, dia.data))?.focus()
  }

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
              {janela.truncada ? ` · janela recortada aos últimos ${JANELA_MAX_DIAS} dias` : ''}
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
          Feriado nunca conta como falta — nem nacional, nem de Blumenau. O dia de hoje só é
          fechado quando termina.
        </p>
      </CardHeader>

      <CardBody>
        {janelaInvertida ? (
          <EmptyState
            title="Nenhum dia na janela selecionada"
            description={`O período pedido termina antes de começar (${inicio?.split('-').reverse().join('/')} → ${fim?.split('-').reverse().join('/')}). Sem dias medidos não dá para afirmar nada sobre presença.`}
          />
        ) : query.isLoading ? (
          <LoadingState label="Levantando presença das apresentadoras" />
        ) : query.isError && !query.data ? (
          <ErrorState message={extractErrorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : linhas.length === 0 ? (
          <EmptyState
            title="Sem apresentadoras no período"
            description="Nenhuma apresentadora ativa nem live encerrada na janela selecionada."
          />
        ) : vazio ? (
          <EmptyState
            title="Nenhum dia na janela selecionada"
            description={`O período ${periodo || 'pedido'} não tem nenhum dia medido. Sem dias medidos não dá para afirmar que alguém faltou — nem que ninguém faltou.`}
          />
        ) : (
          <>
            {apontado ? <TooltipDia texto={apontado.texto} rect={apontado.rect} /> : null}
            <div
              className="overflow-x-auto scrollbar-thin"
              // Rolar com o tooltip aberto o deixaria parado no ar, longe do palitinho: as
              // coordenadas são de viewport e o conteúdo se moveu por baixo delas.
              onScroll={() => setApontado(null)}
            >
              <div className="w-max min-w-full space-y-2">
                {linhas.map((linha) => {
                  // Roving tabindex: a fileira inteira é UMA parada de Tab e as setas percorrem os
                  // dias. Com 366 palitinhos × N apresentadoras, um tabIndex=0 por dia transformaria
                  // a Home num campo minado de milhares de paradas de teclado.
                  const focado = selecao?.linhaId === linha.id ? selecao.indice : 0
                  return (
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
                        {linha.faltas > 0 ? (
                          // <details> nativo: em toque e no teclado o gestor abre e vê QUAIS dias
                          // são as faltas, sem precisar acertar um alvo de 9px nem ter hover.
                          <details className="text-[10px]">
                            <summary className="num cursor-pointer font-bold" style={{ color: 'var(--danger)' }}>
                              {`${linha.faltas} ${linha.faltas === 1 ? 'falta' : 'faltas'}`}
                            </summary>
                            <p className="mt-0.5 leading-snug text-ink-muted">
                              {linha.diasDeFalta.map((d) => `${diaDaSemana(d)} ${diaCurto(d)}`).join(' · ')}
                            </p>
                          </details>
                        ) : (
                          <span className="num text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            sem faltas
                          </span>
                        )}
                      </div>

                      <div
                        className="flex items-end gap-[2px]"
                        style={{ height: 32 }}
                        role="group"
                        aria-label={`Assiduidade de ${linha.nome}: ${linha.dias.length} dias, ${linha.faltas} falta(s)`}
                      >
                        {linha.dias.map((dia, i) => (
                          <PalitoDia
                            key={dia.data}
                            id={idPalito(linha.id, dia.data)}
                            status={dia.status}
                            altura={32}
                            label={descreverDia(dia, metas)}
                            tabbable={i === focado}
                            onSelecionar={() => setSelecao({ linhaId: linha.id, indice: i })}
                            onNavegar={(passo) => navegar(linha, i, passo)}
                            onApontar={(rect) =>
                              setApontado(rect ? { texto: `${linha.nome} · ${descreverDia(dia, metas)}`, rect } : null)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Linha de leitura: o motivo do palitinho em TEXTO, fora do hover. Altura fixa para o
                conteúdo abaixo não pular quando o gestor percorre os dias. */}
            <p
              className="mt-3 min-h-[2.5rem] rounded-lg px-3 py-2 text-xs text-ink-muted"
              style={{ background: 'var(--bg-elev-1)' }}
              aria-live="polite"
            >
              {diaSelecionado && linhaSelecionada
                ? `${linhaSelecionada.nome} · ${descreverDia(diaSelecionado, metas)}`
                : 'Toque num dia (ou chegue nele com Tab e as setas ← →) para ver a data, as horas e o motivo da cor.'}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  )
}
