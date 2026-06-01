import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class Unidade {
  final String id;
  final String nome;
  final int clientesCount;
  final double fatMes;
  final int contratosPendentes;
  final String status;

  const Unidade({
    required this.id,
    required this.nome,
    required this.clientesCount,
    required this.fatMes,
    required this.contratosPendentes,
    required this.status,
  });

  factory Unidade.fromJson(Map<String, dynamic> j) => Unidade(
    id:                  j['id'] as String,
    nome:                j['nome'] as String,
    clientesCount:       int.tryParse(j['clientes_count'].toString()) ?? 0,
    fatMes:              double.tryParse(j['fat_mes'].toString()) ?? 0,
    contratosPendentes:  int.tryParse(j['contratos_pendentes'].toString()) ?? 0,
    status:              j['status'] as String? ?? 'ativo',
  );
}

class FranqueadoNotifier extends AsyncNotifier<List<Unidade>> {
  @override
  Future<List<Unidade>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<Unidade>> _fetch() async {
    final resp = await ApiService.get<List<dynamic>>('/franqueado/unidades');
    return (resp.data as List).map((e) => Unidade.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final franqueadoProvider =
    AsyncNotifierProvider<FranqueadoNotifier, List<Unidade>>(FranqueadoNotifier.new);
