import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/contrato.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';
import 'dashboard_provider.dart';
import 'clientes_provider.dart';
import 'cabines_provider.dart';
import 'recomendacoes_provider.dart';

class ContratosNotifier extends Notifier<void> {
  @override
  void build() {}

  void _invalidateRelacionados() {
    refreshAuditoriaAba('all');
    refreshAuditoriaAba('novos');
    refreshAuditoriaAba('em_tratativa');
    refreshAuditoriaAba('finalizados');
    ref.invalidate(dashboardProvider);
    ref.invalidate(clientesProvider);
    ref.invalidate(cabinesProvider);
    ref.invalidate(recomendacoesProvider);
  }

  void refreshAuditoriaAba(String aba) {
    ref.invalidate(analiseCreditoProvider(aba));
  }

  Future<String> criar({
    required String clienteId,
    required double valorFixo,
    required double comissaoPct,
    String? pacoteId,
    String? tiktokUsername,
  }) async {
    final result = await criarComDetalhes(
      clienteId: clienteId,
      valorFixo: valorFixo,
      comissaoPct: comissaoPct,
      pacoteId: pacoteId,
      tiktokUsername: tiktokUsername,
    );
    return result['id'] as String;
  }

  Future<Map<String, dynamic>> criarComDetalhes({
    required String clienteId,
    required double valorFixo,
    required double comissaoPct,
    String? pacoteId,
    // W3-A: @ TikTok do contrato. Quando null, backend tenta auto-preencher
    // a partir de clientes.tiktok_username e retorna 400 se ambos estiverem vazios.
    String? tiktokUsername,
  }) async {
    final cleanTiktok = tiktokUsername == null
        ? null
        : (tiktokUsername.trim().replaceAll(RegExp(r'^@'), '').isEmpty
            ? null
            : tiktokUsername.trim().replaceAll(RegExp(r'^@'), ''));
    final resp = await ApiService.post('/contratos', data: {
      'cliente_id': clienteId,
      'valor_fixo': valorFixo,
      'comissao_pct': comissaoPct,
      if (pacoteId != null) 'pacote_id': pacoteId,
      if (cleanTiktok != null) 'tiktok_username': cleanTiktok,
    });
    return resp.data as Map<String, dynamic>;
  }

  // Legado — mantido para compatibilidade
  Future<Map<String, dynamic>> assinar(String id) async {
    final resp = await ApiService.post('/contratos/$id/assinar');
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> analisar(String id) async {
    final resp = await ApiService.post('/contratos/$id/analisar');
    return resp.data as Map<String, dynamic>;
  }

  /// Novo fluxo: assina + calcula score + auto-aprova se score >= 60
  Future<Map<String, dynamic>> assinarDigital({
    required String id,
    required String signatureBase64,
  }) async {
    final resp = await ApiService.post('/contratos/$id/assinar-digital', data: {
      'signatureImageBase64': signatureBase64,
      'acceptedTerms': true,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<void> assumirRisco(
    String id, {
    String? confirmacao,
    String? senha,
  }) async {
    await ApiService.patch(
      '/contratos/$id/assumir-risco',
      data: (confirmacao != null && senha != null)
          ? {
              'confirmacao': confirmacao,
              'senha': senha,
            }
          : null,
    );
    _invalidateRelacionados();
  }

  Future<void> cancelar(String id) async {
    await ApiService.patch('/contratos/$id/cancelar');
    _invalidateRelacionados();
  }

  // Backoffice — Análise de Crédito
  Future<void> aprovar(String id) async {
    await ApiService.patch('/contratos/$id/aprovar');
    _invalidateRelacionados();
  }

  Future<void> pendencia(String id, String motivo) async {
    await ApiService.patch('/contratos/$id/pendencia', data: {
      'motivo': motivo,
    });
    _invalidateRelacionados();
  }

  Future<void> reprovar(String id, String motivo) async {
    await ApiService.patch('/contratos/$id/reprovar', data: {
      'motivo': motivo,
    });
    _invalidateRelacionados();
  }

  Future<void> arquivar(String id, {String? motivo}) async {
    await ApiService.patch(
      '/contratos/$id/arquivar',
      data: motivo != null ? {'motivo': motivo} : null,
    );
    _invalidateRelacionados();
  }

  Future<void> sinalizarRisco(String id) async {
    await ApiService.patch('/contratos/$id/sinalizar-risco');
    _invalidateRelacionados();
  }

  Future<void> setTiktokUsername(String contratoId, String? username) async {
    await ApiService.patch('/contratos/$contratoId/tiktok-username', data: {
      'tiktok_username': username,
    });
  }
}

final contratosProvider =
    NotifierProvider<ContratosNotifier, void>(ContratosNotifier.new);

// Provider para a tela de Análise de Crédito
final auditoriaAbaProvider = StateProvider<String>((ref) => 'all');

final analiseCreditoProvider =
    FutureProvider.family<List<Contrato>, String>((ref, aba) async {
  final authState = ref.watch(authProvider);
  if (!authState.isAuthenticated) {
    throw Exception('Não autenticado');
  }
  final resp = await ApiService.get('/analise-credito', params: {'aba': aba});
  final data = resp.data;
  final items = data is Map<String, dynamic>
      ? (data['items'] as List? ?? const [])
      : (data as List? ?? const []);

  return items
      .map((e) => Contrato.fromJson(e as Map<String, dynamic>))
      .toList();
});
