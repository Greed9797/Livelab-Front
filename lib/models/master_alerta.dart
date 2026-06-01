/// Modelo de alerta operacional cross-tenant retornado por
/// `GET /v1/master/alertas`.
///
/// Tipos suportados (sincronizados com backend `src/routes/franqueado.js`):
///   - `gmv_queda_30pct`            queda de GMV >= 30% vs mês anterior
///   - `sem_lives_7dias`            unidade sem lives nos últimos 7 dias
///   - `boleto_vencido`             boletos vencidos abertos
///   - `contrato_expirando_30dias`  contratos ativos expirando em até 30 dias
class MasterAlerta {
  final String tenantId;
  final String nome;
  final String tipoAlerta;
  final String detalhe;

  const MasterAlerta({
    required this.tenantId,
    required this.nome,
    required this.tipoAlerta,
    required this.detalhe,
  });

  factory MasterAlerta.fromJson(Map<String, dynamic> json) {
    return MasterAlerta(
      tenantId: (json['tenant_id'] ?? '').toString(),
      nome: (json['nome'] ?? '').toString(),
      tipoAlerta: (json['tipo_alerta'] ?? '').toString(),
      detalhe: (json['detalhe'] ?? '').toString(),
    );
  }
}
