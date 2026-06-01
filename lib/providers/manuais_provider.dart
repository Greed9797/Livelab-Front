import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class Manual {
  final String id;
  final String titulo;
  final String url;
  final DateTime? atualizadoEm;
  final String? categoria;
  final int? paginas;
  final bool destaque;

  const Manual({
    required this.id,
    required this.titulo,
    required this.url,
    this.atualizadoEm,
    this.categoria,
    this.paginas,
    this.destaque = false,
  });

  factory Manual.fromJson(Map<String, dynamic> j) {
    final raw = j['atualizado_em'];
    return Manual(
      id: j['id'] as String,
      titulo: j['titulo'] as String,
      url: j['url'] as String,
      atualizadoEm: raw is String ? DateTime.tryParse(raw) : null,
      categoria: j['categoria'] as String?,
      paginas: j['paginas'] is int
          ? j['paginas'] as int
          : int.tryParse(j['paginas']?.toString() ?? ''),
      destaque: j['destaque'] == true,
    );
  }
}

class ManuaisNotifier extends AsyncNotifier<List<Manual>> {
  @override
  Future<List<Manual>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<Manual>> _fetch() async {
    final resp = await ApiService.get<List<dynamic>>('/manuais');
    return (resp.data as List).map((e) => Manual.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<Manual> criar(Map<String, dynamic> payload) async {
    final resp = await ApiService.post('/manuais', data: payload);
    final created = Manual.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([created, ...(state.valueOrNull ?? const [])]);
    return created;
  }

  Future<void> remover(String id) async {
    await ApiService.delete('/manuais/$id');
    state = AsyncData(
      (state.valueOrNull ?? const []).where((m) => m.id != id).toList(),
    );
  }
}

final manuaisProvider =
    AsyncNotifierProvider<ManuaisNotifier, List<Manual>>(ManuaisNotifier.new);
