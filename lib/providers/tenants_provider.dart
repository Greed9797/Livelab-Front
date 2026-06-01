import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tenant.dart';
import '../services/api_service.dart';

class TenantsNotifier extends AsyncNotifier<List<Tenant>> {
  @override
  Future<List<Tenant>> build() async {
    return _fetch();
  }

  Future<List<Tenant>> _fetch() async {
    final resp = await ApiService.get('/tenants');
    return (resp.data as List)
        .map((j) => Tenant.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  // Retorna tenant criado + owner + senha_temporaria
  Future<Map<String, dynamic>> criarFranquia(Map<String, dynamic> payload) async {
    final resp = await ApiService.post('/tenants', data: payload);
    final data = resp.data as Map<String, dynamic>;
    final tenant = Tenant.fromJson(data['tenant'] as Map<String, dynamic>);
    state = AsyncData([...state.valueOrNull ?? [], tenant]);
    return data;
  }

  Future<Tenant> atualizar(String id, Map<String, dynamic> payload) async {
    final resp = await ApiService.patch('/tenants/$id', data: payload);
    final updated = Tenant.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      state.valueOrNull?.map((t) => t.id == id ? updated : t).toList() ?? [updated],
    );
    return updated;
  }

  Future<void> alternarStatus(String id, bool ativo) async {
    await ApiService.patch('/tenants/$id/status', data: {'ativo': ativo});
    state = AsyncData(
      state.valueOrNull
              ?.map((t) => t.id == id ? _comStatus(t, ativo) : t)
              .toList() ??
          [],
    );
  }

  Tenant _comStatus(Tenant t, bool ativo) => Tenant(
        id: t.id,
        nome: t.nome,
        ativo: ativo,
        cnpj: t.cnpj,
        telefoneContato: t.telefoneContato,
        emailContato: t.emailContato,
        cidade: t.cidade,
        uf: t.uf,
        plano: t.plano,
        createdAt: t.createdAt,
        ownerId: t.ownerId,
        ownerNome: t.ownerNome,
        ownerEmail: t.ownerEmail,
        livesMes: t.livesMes,
        gmvMes: t.gmvMes,
      );
}

final tenantsProvider =
    AsyncNotifierProvider<TenantsNotifier, List<Tenant>>(TenantsNotifier.new);
