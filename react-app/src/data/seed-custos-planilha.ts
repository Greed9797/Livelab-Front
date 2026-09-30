// Custos manuais da planilha CONTROLE FINANCEIRO LIVELAB 2026 (gerado de SEED_CUSTOS.json).
import type { ImportarCustosPayload } from '../types/financeiro'

export interface SeedCustosPlanilha extends ImportarCustosPayload {
  versao: string
  observacao: string
}

export const SEED_CUSTOS_PLANILHA: SeedCustosPlanilha = {
  versao: "planilha-2026-09",
  observacao: "Custos manuais da planilha CONTROLE FINANCEIRO LIVELAB 2026. Fora: apresentadoras/comissões (sistema), imposto (sistema), Wagner (removido pelo dono), lançamentos pontuais de meses passados.",
  recorrentes: [
    {"nome": "Aluguel + seguro", "descricao": "Aluguel + seguro recorrente mensal", "grupo": "estrutural", "valor": 4083.28, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Condomínio", "descricao": "Taxa condominial, água e energia", "grupo": "estrutural", "valor": 899.3, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Internet dedicada (backup)", "descricao": "Backup internet", "grupo": "estrutural", "valor": 500.0, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Limpeza (diarista) — dia 5", "descricao": "Pagamento de diarista 4x/mês", "grupo": "estrutural", "valor": 180.0, "dia_vencimento": 5, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Limpeza (diarista) — dia 10", "descricao": "Pagamento de diarista 4x/mês", "grupo": "estrutural", "valor": 180.0, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Limpeza (diarista) — dia 15", "descricao": "Pagamento de diarista 4x/mês", "grupo": "estrutural", "valor": 180.0, "dia_vencimento": 15, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Limpeza (diarista) — dia 20", "descricao": "Pagamento de diarista 4x/mês", "grupo": "estrutural", "valor": 180.0, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Consumo de escritório", "descricao": "Café, sacos de lixo, papel higiênico (Cartão LiveLab)", "grupo": "cartao", "valor": 600.0, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Kalodata", "descricao": "Ferramenta (Cartão LiveLab)", "grupo": "cartao", "valor": 450.0, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Wifi escritório", "descricao": "Internet do escritório (Cartão LiveLab)", "grupo": "cartao", "valor": 320.0, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Tarifa Sicoob", "descricao": "Tarifa pacote de serviço (Cartão LiveLab)", "grupo": "cartao", "valor": 30.85, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Microfones lapela (parcela)", "descricao": "Parcelas set–dez (Cartão LiveLab)", "grupo": "cartao", "valor": 150.4, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "Contabilidade", "descricao": "Contabilidade recorrente mensal", "grupo": "diversos", "valor": 600.0, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
    {"nome": "Joyn RH (parcela)", "descricao": "Boleto parcelado até dezembro", "grupo": "diversos", "valor": 1588.0, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "Aluguel computadores Dell (Help do Brasil)", "descricao": "Aluguel computadores Dell — até dezembro", "grupo": "investimento", "valor": 1560.0, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "Cartão Rui — parcelas ML/Magalu", "descricao": "Total mensal consolidado — até dezembro", "grupo": "investimento", "valor": 2297.86, "dia_vencimento": 20, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "Placa/letreiro (Cartão Lucas)", "descricao": "Parcela mensal — até dezembro", "grupo": "investimento", "valor": 200.0, "dia_vencimento": 5, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "4 iPhones (Cartão Jhennifer)", "descricao": "Parcela mensal — até dezembro", "grupo": "investimento", "valor": 1659.13, "dia_vencimento": 10, "mes_offset": 0, "inicio": "2026-09-01", "fim": "2026-12-31"},
    {"nome": "Prolabore", "descricao": "Pagamento sócios", "grupo": "prolabore", "valor": 7000.0, "dia_vencimento": 15, "mes_offset": 0, "inicio": "2026-09-01", "fim": null},
  ],
  pontuais: [
    {"descricao": "2 iPhones — parcela 1/4", "grupo": "investimento", "valor": 965.87, "data_vencimento": "2026-09-05", "competencia": "2026-09-01", "parcela_num": 1, "parcelas_total": 4},
    {"descricao": "2 iPhones — parcela 2/4", "grupo": "investimento", "valor": 965.88, "data_vencimento": "2026-10-05", "competencia": "2026-10-01", "parcela_num": 2, "parcelas_total": 4},
    {"descricao": "2 iPhones — parcela 3/4", "grupo": "investimento", "valor": 965.89, "data_vencimento": "2026-11-05", "competencia": "2026-11-01", "parcela_num": 3, "parcelas_total": 4},
    {"descricao": "2 iPhones — parcela 4/4", "grupo": "investimento", "valor": 965.9, "data_vencimento": "2026-12-05", "competencia": "2026-12-01", "parcela_num": 4, "parcelas_total": 4},
    {"descricao": "Devolução de aporte (Jorge)", "grupo": "investimento", "valor": 3231.61, "data_vencimento": "2026-09-30", "competencia": "2026-09-01"},
  ],
}
