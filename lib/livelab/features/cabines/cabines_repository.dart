// CRUD + ações operacionais de cabines/lives.
// Backend: src/routes/cabines.js (rotas /v1/cabines, /v1/lives, /v1/solicitacoes).

import 'package:flutter/foundation.dart' show debugPrint;

import '../../../services/api_service.dart';
import 'cabines_models.dart';

abstract class CabinesRepository {
  Future<List<Cabin>> fetchAll();
  Future<List<UpcomingScheduleEntry>> fetchProximas4h();

  Future<void> reservarCabine(String cabineId, {required String clienteId});
  Future<void> liberarCabine(String cabineId);
  Future<void> setManutencao(String cabineId, {required String motivo, String? eta});
  Future<String> iniciarLiveManual(String cabineId, {
    required String clienteId,
    String? apresentadorId,
    String? titulo,
  });
  Future<void> encerrarLive(
    String liveId, {
    double fatGerado = 0,
    int? qtdPedidos,
    String? resumo,
    int? manualLikes,
    int? manualViews,
    int? manualOrders,
    double? manualGmv,
  });
}

class ApiCabinesRepository extends CabinesRepository {
  @override
  Future<List<Cabin>> fetchAll() async {
    final raw = (await ApiService.get<List<dynamic>>('/cabines')).data!;
    return raw.map((c) => _mapCabin(c as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<UpcomingScheduleEntry>> fetchProximas4h() async {
    try {
      final resp = await ApiService.get<List<dynamic>>(
        '/solicitacoes',
        params: {'status': 'aprovada'},
      );
      final now = DateTime.now();
      final cutoff = now.add(const Duration(hours: 4));
      final entries = <UpcomingScheduleEntry>[];
      for (final raw in (resp.data ?? const [])) {
        final m = raw as Map<String, dynamic>;
        final data = m['data_solicitada'] as String?;
        final hora = (m['hora_inicio'] as String?)?.substring(0, 5);
        if (data == null || hora == null) continue;
        final dt = DateTime.tryParse('${data}T$hora:00');
        if (dt == null) continue;
        if (dt.isBefore(now) || dt.isAfter(cutoff)) continue;
        entries.add(UpcomingScheduleEntry(
          timeLabel: hora,
          title: m['cliente_nome']?.toString() ?? 'Live agendada',
          subtitle: 'Cabine ${(m['cabine_numero'] ?? '').toString().padLeft(2, '0')} · ${m['solicitante_nome'] ?? ''}',
        ));
      }
      entries.sort((a, b) => a.timeLabel.compareTo(b.timeLabel));
      return entries;
    } catch (e, st) {
      debugPrint('[cabines] fetchProximas4h falhou: $e\n$st');
      return const [];
    }
  }

  @override
  Future<void> reservarCabine(String cabineId, {required String clienteId}) async {
    await ApiService.patch('/cabines/$cabineId/reservar', data: {
      'cliente_id': clienteId,
    });
  }

  @override
  Future<void> liberarCabine(String cabineId) async {
    await ApiService.patch('/cabines/$cabineId/liberar', data: {});
  }

  @override
  Future<void> setManutencao(String cabineId, {required String motivo, String? eta}) async {
    await ApiService.patch('/cabines/$cabineId/status', data: {
      'status': 'manutencao',
      'manutencao_motivo': motivo,
      if (eta != null) 'manutencao_eta': eta,
    });
  }

  @override
  Future<String> iniciarLiveManual(String cabineId, {
    required String clienteId,
    String? apresentadorId,
    String? titulo,
  }) async {
    final resp = await ApiService.post<Map<String, dynamic>>(
      '/lives/manual',
      data: {
        'cabine_id': cabineId,
        'cliente_id': clienteId,
        if (apresentadorId != null) 'apresentador_id': apresentadorId,
        if (titulo != null) 'titulo': titulo,
      },
    );
    return resp.data!['id'] as String;
  }

  @override
  Future<void> encerrarLive(
    String liveId, {
    double fatGerado = 0,
    int? qtdPedidos,
    String? resumo,
    int? manualLikes,
    int? manualViews,
    int? manualOrders,
    double? manualGmv,
  }) async {
    await ApiService.patch('/lives/$liveId/encerrar', data: {
      'fat_gerado': fatGerado,
      if (qtdPedidos != null) 'qtd_pedidos': qtdPedidos,
      if (resumo != null && resumo.trim().isNotEmpty) 'resumo': resumo.trim(),
      if (manualLikes != null) 'manual_likes': manualLikes,
      if (manualViews != null) 'manual_views': manualViews,
      if (manualOrders != null) 'manual_orders': manualOrders,
      if (manualGmv != null) 'manual_gmv': manualGmv,
    });
  }

  static CabinStatus _mapStatus(String? s) {
    switch (s) {
      case 'ao_vivo':
        return CabinStatus.live;
      case 'reservada':
      case 'ocupada':
        return CabinStatus.busy;
      case 'manutencao':
        return CabinStatus.maint;
      default:
        return CabinStatus.free;
    }
  }

  static Cabin _mapCabin(Map<String, dynamic> c) {
    return Cabin(
      id: c['id'] as String,
      number: (c['numero'] as num? ?? 0).toInt(),
      status: _mapStatus(c['status'] as String?),
      liveAtualId: c['live_atual_id'] as String?,
      contratoId: c['contrato_id'] as String?,
      clienteId: c['cliente_id'] as String?,
      client: c['cliente_nome'] as String?,
      presenter: c['apresentador_nome'] as String?,
      contract: c['contrato'] as String?,
      views: (c['viewer_count'] as num? ?? 0).toInt(),
      gmv: (c['gmv_atual'] as num? ?? 0).toDouble(),
      orders: (c['total_orders'] as num? ?? 0).toInt(),
    );
  }
}
