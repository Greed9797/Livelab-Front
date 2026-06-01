import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/franqueado_analytics_resumo.dart';
import '../services/api_service.dart';

final franqueadoAnalyticsResumoProvider =
    FutureProvider<FranqueadoAnalyticsResumo>((ref) async {
  final response = await ApiService.get('/analytics/franqueado/resumo');
  return FranqueadoAnalyticsResumo.fromJson(
    Map<String, dynamic>.from(response.data as Map),
  );
});
