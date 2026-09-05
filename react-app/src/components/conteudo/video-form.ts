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
