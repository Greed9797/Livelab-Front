import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin_master.dart';
import '../services/api_service.dart';

Future<Map<String, dynamic>> _getMap(
  String path, {
  Map<String, dynamic>? params,
}) async {
  final response = await ApiService.get<Map<String, dynamic>>(
    path,
    params: params,
  );
  return Map<String, dynamic>.from(response.data as Map);
}

final masterDashboardProvider =
    FutureProvider.family<MasterDashboardData, String>((ref, period) async {
      final data = await _getMap(
        '/master/dashboard',
        params: {'periodo': period},
      );
      return MasterDashboardData.fromJson(data);
    });

final masterUnitsProvider =
    FutureProvider.family<MasterUnitsData, ({String period, String status})>((
      ref,
      filters,
    ) async {
      final data = await _getMap(
        '/master/unidades',
        params: {'periodo': filters.period, 'status': filters.status},
      );
      return MasterUnitsData.fromJson(data);
    });

final masterConsolidatedProvider =
    FutureProvider.family<
      MasterConsolidatedData,
      ({String period, String status})
    >((ref, filters) async {
      final data = await _getMap(
        '/master/consolidado',
        params: {'periodo': filters.period, 'status': filters.status},
      );
      return MasterConsolidatedData.fromJson(data);
    });

final masterCrmProvider = FutureProvider<MasterCrmData>((ref) async {
  // Endpoint comercial — aceita master/franqueado/gerente (mesma estrutura).
  final data = await _getMap('/crm/summary');
  return MasterCrmData.fromJson(data);
});
