import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ConvitePendente {
  final String id;
  final String nome;
  final String email;
  final String papel;
  final String? inviteExpiraEm;
  final bool expirou;
  final int? diasRestantes;
  final String? criadoEm;
  final String? convidadoPorNome;

  const ConvitePendente({
    required this.id,
    required this.nome,
    required this.email,
    required this.papel,
    this.inviteExpiraEm,
    required this.expirou,
    this.diasRestantes,
    this.criadoEm,
    this.convidadoPorNome,
  });

  factory ConvitePendente.fromJson(Map<String, dynamic> j) {
    return ConvitePendente(
      id: j['id'] as String,
      nome: j['nome'] as String,
      email: j['email'] as String,
      papel: j['papel'] as String,
      inviteExpiraEm: j['invite_expira_em'] as String?,
      expirou: j['expirou'] as bool? ?? false,
      diasRestantes: (j['dias_restantes'] as num?)?.toInt(),
      criadoEm: j['criado_em'] as String?,
      convidadoPorNome: j['convidado_por_nome'] as String?,
    );
  }
}

class ConvitesNotifier extends AsyncNotifier<List<ConvitePendente>> {
  @override
  Future<List<ConvitePendente>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) return const [];
    return _fetch();
  }

  Future<List<ConvitePendente>> _fetch() async {
    final resp = await ApiService.get('/usuarios/convites-pendentes');
    return (resp.data as List)
        .map((j) => ConvitePendente.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Reenviar convites em lote. Retorna { reenviados, falhas }.
  Future<Map<String, dynamic>> reenviarBulk(List<String> ids) async {
    final resp = await ApiService.post(
      '/usuarios/convites/reenviar-bulk',
      data: {'ids': ids},
    );
    await refresh();
    return resp.data as Map<String, dynamic>;
  }

  /// Cancela um convite (deleta user que nunca aceitou).
  Future<void> cancelar(String id) async {
    await ApiService.delete('/usuarios/convites/$id');
    state = AsyncData(
      state.valueOrNull?.where((c) => c.id != id).toList() ?? [],
    );
  }
}

final convitesProvider =
    AsyncNotifierProvider<ConvitesNotifier, List<ConvitePendente>>(
        ConvitesNotifier.new);
