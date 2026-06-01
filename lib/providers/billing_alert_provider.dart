import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/boleto_alerta.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class BillingAlertNotifier extends AsyncNotifier<BoletoAlerta?> {
  @override
  Future<BoletoAlerta?> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<BoletoAlerta?> _fetch() async {
    try {
      final resp = await ApiService.get('/boletos/alertas');
      if (resp.data == null || resp.data.toString().isEmpty) {
        return null;
      }
      return BoletoAlerta.fromJson(resp.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  Future<void> marcarVisto(String id) async {
    try {
      await ApiService.patch('/boletos/$id/visto');
      state = const AsyncData(null); // Limpa do provider
    } catch (_) {}
  }
}

final billingAlertProvider =
    AsyncNotifierProvider<BillingAlertNotifier, BoletoAlerta?>(
        BillingAlertNotifier.new);
