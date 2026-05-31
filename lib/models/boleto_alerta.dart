class BoletoAlerta {
  final String id;
  final double valor;
  final String vencimento;
  final String? asaasUrl;
  final String? asaasPixCopiaCola;

  const BoletoAlerta({
    required this.id,
    required this.valor,
    required this.vencimento,
    this.asaasUrl,
    this.asaasPixCopiaCola,
  });

  factory BoletoAlerta.fromJson(Map<String, dynamic> j) => BoletoAlerta(
    id: j['id'] as String,
    valor: j['valor'] == null ? 0.0 : double.tryParse(j['valor'].toString()) ?? 0.0,
    vencimento: j['vencimento'] as String,
    asaasUrl: j['asaas_url'] as String?,
    asaasPixCopiaCola: j['asaas_pix_copia_cola'] as String?,
  );
}
