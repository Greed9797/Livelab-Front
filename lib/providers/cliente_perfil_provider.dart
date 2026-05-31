// Perfil do cliente_parceiro autenticado: nome, logo_url, site, etc.
// Usado pra exibir logo do cliente em avatar topbar + sidebar footer.
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class ClientePerfil {
  final String? id;
  final String? nome;
  final String? email;
  final String? logoUrl;
  final String? site;
  // W3-A: @ TikTok do cliente — usado pelo connector pra puxar métricas das lives.
  final String? tiktokUsername;

  const ClientePerfil({
    this.id,
    this.nome,
    this.email,
    this.logoUrl,
    this.site,
    this.tiktokUsername,
  });

  ClientePerfil copyWith({String? tiktokUsername}) => ClientePerfil(
        id: id,
        nome: nome,
        email: email,
        logoUrl: logoUrl,
        site: site,
        tiktokUsername: tiktokUsername ?? this.tiktokUsername,
      );

  factory ClientePerfil.fromJson(Map<String, dynamic> j) => ClientePerfil(
        id: j['id'] as String?,
        nome: j['nome'] as String?,
        email: j['email'] as String?,
        logoUrl: j['logo_url'] as String?,
        site: j['site'] as String?,
        tiktokUsername: j['tiktok_username'] as String?,
      );
}

final clientePerfilProvider = FutureProvider<ClientePerfil?>((ref) async {
  final auth = ref.watch(authProvider);
  if (!auth.isAuthenticated || auth.user?.papel != 'cliente_parceiro') {
    return null;
  }
  try {
    final resp = await ApiService.get<Map<String, dynamic>>('/cliente/perfil');
    return ClientePerfil.fromJson(resp.data as Map<String, dynamic>);
  } catch (e) {
    debugPrint('[clientePerfilProvider] falhou: $e');
    return null;
  }
});

/// Atualiza o @TikTok do PRÓPRIO cliente_parceiro autenticado.
/// Backend filtra por user_id (sub do JWT) — cliente só edita o próprio.
/// Após sucesso, invalida o [clientePerfilProvider] pra refletir nova @ na UI.
Future<void> atualizarTiktokUsername(WidgetRef ref, String? username) async {
  final normalized = username == null
      ? null
      : (username.trim().replaceAll(RegExp(r'^@'), '').isEmpty
          ? null
          : username.trim().replaceAll(RegExp(r'^@'), ''));
  await ApiService.post('/cliente/perfil/tiktok', data: {
    'tiktok_username': normalized,
  });
  ref.invalidate(clientePerfilProvider);
}
