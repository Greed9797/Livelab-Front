import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { PresenterSelect } from '../forms/PresenterSelect'
import type { ImportApresentadoraRateio } from '../../services/domain'
import { asArray, asNumber, asString, formatMoney } from '../../utils/format'
import { formatDiferenca, formatDuracao, parseDuracao } from '../../utils/duracao'
import type { JsonRecord } from '../../types/models'

interface ImportRateioModalProps {
  row: JsonRecord
  apresentadoras: JsonRecord[]
  onClose: () => void
  onSave: (lista: ImportApresentadoraRateio[]) => void
  isSaving: boolean
}

interface LinhaRateio {
  apresentadora_id: string
  tempoTexto: string
  gmv: number
}

/** Centavos: comparar R$ em float diretamente reprova soma correta por 1e-13. */
const centavos = (valor: number) => Math.round(valor * 100)

/** Tempo é digitado em minutos cheios; o resto de segundos da live cabe nessa folga. */
const TOLERANCIA_SEGUNDOS = 60

function novaLinha(): LinhaRateio {
  return { apresentadora_id: '', tempoTexto: '', gmv: 0 }
}

/**
 * Divide a live entre apresentadoras por VALOR, não por porcentagem: "a Ana fez 4h e vendeu
 * R$ 3.000". A soma tem que fechar o tempo e o GMV da live — é o mesmo contrato que o backend
 * cobra em normalizarRateio (src/routes/analytics.js).
 */
export function ImportRateioModal({ row, apresentadoras, onClose, onSave, isSaving }: ImportRateioModalProps) {
  const totalSegundos = asNumber(row.duration_seconds)
  const gmvTotal = asNumber(row.attributed_gmv ?? row.ads_gmv)

  const [lista, setLista] = useState<LinhaRateio[]>(() => {
    const atual = asArray<JsonRecord>(row.apresentadoras)
      .map((item) => {
        const percentual = asNumber(item.percentual)
        // Lote salvo antes desta tela só tem percentual: converte para valor na abertura.
        const segundos = item.segundos != null ? asNumber(item.segundos) : (totalSegundos * percentual) / 100
        const gmv = item.gmv != null ? asNumber(item.gmv) : (gmvTotal * percentual) / 100
        return {
          apresentadora_id: asString(item.apresentadora_id, ''),
          tempoTexto: segundos > 0 ? formatDuracao(segundos) : '',
          gmv: Math.round(gmv * 100) / 100,
        }
      })
      .filter((item) => item.apresentadora_id)
    return atual.length > 0 ? atual : [{ ...novaLinha(), tempoTexto: formatDuracao(totalSegundos), gmv: gmvTotal }]
  })

  const segundosDe = (linha: LinhaRateio) => parseDuracao(linha.tempoTexto) ?? 0
  const somaSegundos = lista.reduce((acc, item) => acc + segundosDe(item), 0)
  const somaGmv = lista.reduce((acc, item) => acc + (Number(item.gmv) || 0), 0)

  const difSegundos = somaSegundos - totalSegundos
  const difCentavos = centavos(somaGmv) - centavos(gmvTotal)

  const tempoInvalido = lista.some((item) => item.tempoTexto.trim() !== '' && parseDuracao(item.tempoTexto) === null)
  const fechaTempo = !tempoInvalido && (totalSegundos === 0 || Math.abs(difSegundos) <= TOLERANCIA_SEGUNDOS)
  const fechaGmv = difCentavos === 0
  const semVazio = lista.length > 0 && lista.every((item) => item.apresentadora_id)
  const semRepetida = new Set(lista.map((item) => item.apresentadora_id)).size === lista.length
  const podeSalvar = fechaTempo && fechaGmv && semVazio && semRepetida && !isSaving

  function update(index: number, patch: Partial<LinhaRateio>) {
    setLista((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  /** Divide tempo e GMV igualmente; a última linha absorve o resto para fechar exato. */
  function dividirIgual(base: LinhaRateio[]): LinhaRateio[] {
    if (base.length === 0) return base
    const fatiaSegundos = Math.floor(totalSegundos / base.length)
    const fatiaCentavos = Math.floor(centavos(gmvTotal) / base.length)
    return base.map((item, index) => {
      const ultima = index === base.length - 1
      const segundos = ultima ? totalSegundos - fatiaSegundos * (base.length - 1) : fatiaSegundos
      const cents = ultima ? centavos(gmvTotal) - fatiaCentavos * (base.length - 1) : fatiaCentavos
      return { ...item, tempoTexto: formatDuracao(segundos), gmv: cents / 100 }
    })
  }

  /**
   * O que sai daqui fecha o tempo da live no segundo: a tela trabalha em minutos cheios, então
   * a última linha leva a sobra. O GMV não é ajustado — dinheiro sai exatamente como digitado.
   */
  function montarPayload(): ImportApresentadoraRateio[] {
    const segundos = lista.map(segundosDe)
    const soma = segundos.reduce((acc, valor) => acc + valor, 0)
    if (totalSegundos > 0 && soma !== totalSegundos) {
      segundos[segundos.length - 1] += totalSegundos - soma
    }
    return lista.map((item, index) => ({
      apresentadora_id: item.apresentadora_id,
      segundos: Math.max(0, segundos[index]),
      gmv: Math.round(Number(item.gmv) * 100) / 100,
    }))
  }

  return (
    <Modal
      open
      title="Apresentadoras da live"
      subtitle={`${formatDuracao(totalSegundos)} · ${formatMoney(gmvTotal)} a dividir`}
      size="lg"
      onClose={onClose}
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col text-xs font-semibold">
            <span className={fechaTempo ? 'text-emerald-600' : 'text-red-600'}>
              Tempo: {formatDuracao(somaSegundos)} de {formatDuracao(totalSegundos)}
              {fechaTempo ? '' : ` · ${difSegundos < 0 ? 'faltam' : 'sobram'} ${formatDiferenca(difSegundos)}`}
            </span>
            <span className={fechaGmv ? 'text-emerald-600' : 'text-red-600'}>
              GMV: {formatMoney(somaGmv)} de {formatMoney(gmvTotal)}
              {fechaGmv ? '' : ` · ${difCentavos < 0 ? 'faltam' : 'sobram'} ${formatMoney(Math.abs(difCentavos) / 100)}`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={!podeSalvar} isLoading={isSaving} onClick={() => onSave(montarPayload())}>
              Salvar rateio
            </Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-3">
        {lista.map((item, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-2xl border border-line p-3">
            <PresenterSelect
              className="min-w-[200px] flex-1"
              label={index === 0 ? 'Principal' : 'Apoio'}
              value={item.apresentadora_id}
              rows={apresentadoras}
              onChange={(value) => update(index, { apresentadora_id: value })}
            />
            <label className="block w-28">
              <span className="text-sm font-semibold text-ink">Tempo</span>
              <input
                className="design-input mt-2 h-11 w-full px-3 text-right"
                type="text"
                inputMode="text"
                placeholder="4h30"
                value={item.tempoTexto}
                onChange={(event) => update(index, { tempoTexto: event.target.value })}
              />
            </label>
            <label className="block w-36">
              <span className="text-sm font-semibold text-ink">GMV (R$)</span>
              <input
                className="design-input mt-2 h-11 w-full px-3 text-right"
                type="number"
                min={0}
                step={0.01}
                value={item.gmv}
                onChange={(event) => update(index, { gmv: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="mb-1 rounded-full border border-line p-2 text-ink-muted hover:bg-surface-muted"
              aria-label="Remover apresentadora"
              onClick={() => setLista((prev) => {
                const restante = prev.filter((_, i) => i !== index)
                return restante.length > 0 ? dividirIgual(restante) : [novaLinha()]
              })}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {tempoInvalido ? (
          <p className="text-sm text-red-600">Tempo não reconhecido. Use 4h30, 4:30 ou 4,5.</p>
        ) : null}
        {!semRepetida ? <p className="text-sm text-red-600">Há apresentadora repetida no rateio.</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            icon={Users}
            onClick={() => setLista((prev) => [...prev, novaLinha()])}
          >
            Adicionar apresentadora
          </Button>
          <Button type="button" variant="ghost" onClick={() => setLista((prev) => dividirIgual(prev))}>
            Dividir igual
          </Button>
        </div>
      </div>
    </Modal>
  )
}
