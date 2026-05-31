class Boleto {
  final String id;
  final String tipo;
  final double valor;
  final DateTime vencimento;
  final String status;
  final DateTime? pagoEm;
  final String? referenciaExterna;

  // Campos Asaas (nullable — retrocompatíveis com boletos antigos)
  final String? asaasId;
  final String? asaasUrl;
  final String? asaasPix;
  // Non-nullable with default false — boletos antigos não têm esta coluna; null vira false no fromJson.
  final bool geradoAutomaticamente;
  final String? asaasError;
  final DateTime? criadoEm;

  const Boleto({
    required this.id,
    required this.tipo,
    required this.valor,
    required this.vencimento,
    required this.status,
    this.pagoEm,
    this.referenciaExterna,
    this.asaasId,
    this.asaasUrl,
    this.asaasPix,
    this.geradoAutomaticamente = false,
    this.asaasError,
    this.criadoEm,
  });

  factory Boleto.fromJson(Map<String, dynamic> j) => Boleto(
    id:                  j['id'] as String,
    tipo:                j['tipo'] as String,
    valor:               double.tryParse(j['valor']?.toString() ?? '') ?? 0.0,
    vencimento:          DateTime.parse(j['vencimento'] as String),
    status:              j['status'] as String,
    pagoEm:              j['pago_em'] != null ? DateTime.parse(j['pago_em'] as String) : null,
    referenciaExterna:   j['referencia_externa'] as String?,
    asaasId:             j['asaas_id'] as String?,
    asaasUrl:            j['asaas_url'] as String?,
    asaasPix:            j['asaas_pix_copia_cola'] as String?,
    geradoAutomaticamente: j['gerado_automaticamente'] as bool? ?? false,
    asaasError:          j['asaas_error'] as String?,
    criadoEm:            j['criado_em'] != null ? DateTime.parse(j['criado_em'] as String) : null,
  );

  // Convenience getters
  bool get temLinkPagamento => asaasUrl?.isNotEmpty ?? false;
  bool get temErroAsaas => asaasError?.isNotEmpty ?? false;
  bool get isPendente => status == 'pendente';
  bool get isPago => status == 'pago';
  bool get isVencido =>
      status == 'vencido' ||
      (status == 'pendente' && vencimento.isBefore(DateTime.now()));
}
