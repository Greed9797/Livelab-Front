import { CheckCircle2, Edit2, Plus, Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { MoneyInput } from '../ui/MoneyInput'
import { PresenterSelect } from '../forms/PresenterSelect'
import { asNumber, asString, formatDate, formatMoney } from '../../utils/format'
import { extractErrorMessage } from '../../services/api'
import type { JsonRecord } from '../../types/models'
import type { UseMutationResult } from '@tanstack/react-query'

const today = () => new Date().toISOString().slice(0, 10)

export const emptyVideo = {
  marca_id: '',
  apresentadora_id: '',
  data: today(),
  quantidade: '1',
  plataforma: 'tiktok',
  campanha: '',
  gmv_atribuido: '0',
  pedidos_atribuidos: '0',
  observacoes: '',
}

export type VideoForm = typeof emptyVideo

export interface VideosTabProps {
  /** false = papel read-only: lista visível, ações de escrita escondidas. */
  canWrite?: boolean
  videosData: JsonRecord[]
  marcaRows: JsonRecord[]
  apresentadoraRows: JsonRecord[]
  videoModalOpen: boolean
  videoForm: VideoForm
  selectedVideo: JsonRecord | null
  createVideoMutation: UseMutationResult<unknown, Error, JsonRecord>
  updateVideoMutation: UseMutationResult<unknown, Error, { id: string; payload: JsonRecord }>
  deleteVideoMutation: UseMutationResult<unknown, Error, string>
  onOpenCreateVideoModal: () => void
  onOpenEditVideoModal: (video: JsonRecord) => void
  onDeleteVideo: (video: JsonRecord) => void
  onCloseVideoModal: () => void
  onVideoFieldChange: (key: keyof VideoForm, value: string) => void
  onVideoSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function VideosTab({
  canWrite = true,
  videosData,
  marcaRows,
  apresentadoraRows,
  videoModalOpen,
  videoForm,
  selectedVideo,
  createVideoMutation,
  updateVideoMutation,
  deleteVideoMutation,
  onOpenCreateVideoModal,
  onOpenEditVideoModal,
  onDeleteVideo,
  onCloseVideoModal,
  onVideoFieldChange,
  onVideoSubmit,
}: VideosTabProps) {
  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">Vídeos gravados</p>
            {canWrite ? (
              <Button icon={Plus} onClick={onOpenCreateVideoModal}>
                Registrar vídeo
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <DataTable<JsonRecord>
            data={videosData}
            columns={[
              {
                key: 'data',
                header: 'Data',
                render: (item) => formatDate(asString(item.data, '')),
              },
              {
                key: 'marca_nome',
                header: 'Marca',
                render: (item) => asString(item.marca_nome),
              },
              {
                key: 'apresentadora_nome',
                header: 'Apresentadora',
                render: (item) => asString(item.apresentadora_nome),
              },
              {
                key: 'quantidade',
                header: 'Qtd',
                align: 'right',
                render: (item) => asNumber(item.quantidade).toLocaleString('pt-BR'),
              },
              {
                key: 'gmv_atribuido',
                header: 'GMV',
                align: 'right',
                render: (item) => formatMoney(item.gmv_atribuido),
              },
              {
                key: 'pedidos_atribuidos',
                header: 'Pedidos',
                align: 'right',
                render: (item) =>
                  asNumber(item.pedidos_atribuidos).toLocaleString('pt-BR'),
              },
              ...(canWrite ? [{
                key: 'acoes',
                header: 'Ações',
                align: 'right' as const,
                render: (item: JsonRecord) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      icon={Edit2}
                      onClick={() => onOpenEditVideoModal(item)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      disabled={deleteVideoMutation.isPending}
                      onClick={() => onDeleteVideo(item)}
                    >
                      Excluir
                    </Button>
                  </div>
                ),
              }] : []),
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={videoModalOpen}
        title={selectedVideo ? 'Editar vídeo' : 'Registrar vídeo'}
        subtitle="Registro operacional de vídeos, GMV e pedidos atribuídos."
        size="lg"
        onClose={onCloseVideoModal}
      >
        <form className="space-y-3" onSubmit={onVideoSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Marca</span>
            <select
              className="design-input mt-2 h-11 w-full px-4"
              value={videoForm.marca_id}
              onChange={(e) => onVideoFieldChange('marca_id', e.target.value)}
              required
            >
              <option value="">Selecione uma marca</option>
              {marcaRows.map((item) => (
                <option key={asString(item.id, '')} value={asString(item.id, '')}>
                  {asString(item.nome)}
                </option>
              ))}
            </select>
          </label>
          <PresenterSelect
            rows={apresentadoraRows}
            value={videoForm.apresentadora_id}
            onChange={(value) => onVideoFieldChange('apresentadora_id', value)}
            placeholder="Sem apresentadora definida"
          />
          <label className="block">
            <span className="text-sm font-semibold text-ink">Data da gravação</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              type="date"
              value={videoForm.data}
              onChange={(e) => onVideoFieldChange('data', e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">Quantidade</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="text"
                inputMode="numeric"
                pattern="[0-9.,]*"
                value={videoForm.quantidade}
                onChange={(e) => onVideoFieldChange('quantidade', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Plataforma</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                value={videoForm.plataforma}
                onChange={(e) => onVideoFieldChange('plataforma', e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Campanha</span>
            <input
              className="design-input mt-2 h-11 w-full px-4"
              value={videoForm.campanha}
              onChange={(e) => onVideoFieldChange('campanha', e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-ink">GMV atribuído</span>
              <MoneyInput
                className="design-input mt-2 h-11 w-full px-4"
                value={videoForm.gmv_atribuido}
                onChange={(raw) => onVideoFieldChange('gmv_atribuido', raw)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Pedidos atribuídos</span>
              <input
                className="design-input mt-2 h-11 w-full px-4"
                type="text"
                inputMode="numeric"
                pattern="[0-9.,]*"
                value={videoForm.pedidos_atribuidos}
                onChange={(e) => onVideoFieldChange('pedidos_atribuidos', e.target.value)}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Observações</span>
            <textarea
              className="design-input mt-2 min-h-24 w-full px-4 py-3"
              value={videoForm.observacoes}
              onChange={(e) => onVideoFieldChange('observacoes', e.target.value)}
            />
          </label>
          {createVideoMutation.isError || updateVideoMutation.isError ? (
            <p className="rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
              {extractErrorMessage(createVideoMutation.error ?? updateVideoMutation.error)}
            </p>
          ) : null}
          <Button
            type="submit"
            icon={selectedVideo ? CheckCircle2 : Plus}
            isLoading={createVideoMutation.isPending || updateVideoMutation.isPending}
          >
            {selectedVideo ? 'Salvar vídeo' : 'Registrar vídeo'}
          </Button>
        </form>
      </Modal>
    </section>
  )
}
