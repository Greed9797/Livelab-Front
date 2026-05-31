import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/audit_log_entry.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

/// Filtros reativos aplicados ao audit log.
class AuditLogFiltros {
  final String? action;
  final String? entityType;
  final String? userId;
  final DateTime? desde;
  final int pagina;
  final int porPagina;

  const AuditLogFiltros({
    this.action,
    this.entityType,
    this.userId,
    this.desde,
    this.pagina = 1,
    this.porPagina = 50,
  });

  AuditLogFiltros copyWith({
    Object? action = _sentinel,
    Object? entityType = _sentinel,
    Object? userId = _sentinel,
    Object? desde = _sentinel,
    int? pagina,
    int? porPagina,
  }) {
    return AuditLogFiltros(
      action: action == _sentinel ? this.action : action as String?,
      entityType:
          entityType == _sentinel ? this.entityType : entityType as String?,
      userId: userId == _sentinel ? this.userId : userId as String?,
      desde: desde == _sentinel ? this.desde : desde as DateTime?,
      pagina: pagina ?? this.pagina,
      porPagina: porPagina ?? this.porPagina,
    );
  }
}

const _sentinel = Object();

/// Provider de filtros — telas escrevem aqui via .notifier.update().
final auditLogFiltrosProvider =
    NotifierProvider<AuditLogFiltrosNotifier, AuditLogFiltros>(
  AuditLogFiltrosNotifier.new,
);

class AuditLogFiltrosNotifier extends Notifier<AuditLogFiltros> {
  @override
  AuditLogFiltros build() => const AuditLogFiltros();

  void setAction(String? value) {
    state = state.copyWith(action: value, pagina: 1);
  }

  void setEntityType(String? value) {
    state = state.copyWith(entityType: value, pagina: 1);
  }

  void setUserId(String? value) {
    state = state.copyWith(userId: value, pagina: 1);
  }

  void setDesde(DateTime? value) {
    state = state.copyWith(desde: value, pagina: 1);
  }

  void setPagina(int value) {
    state = state.copyWith(pagina: value < 1 ? 1 : value);
  }

  void reset() {
    state = const AuditLogFiltros();
  }
}

/// Lista atual do audit log, controlada pelos filtros.
final auditLogProvider =
    AsyncNotifierProvider<AuditLogNotifier, AuditLogPage>(
  AuditLogNotifier.new,
);

class AuditLogNotifier extends AsyncNotifier<AuditLogPage> {
  @override
  Future<AuditLogPage> build() async {
    // Re-executa quando auth muda ou filtros mudam.
    final auth = ref.watch(authProvider);
    if (auth.user == null) {
      throw const ApiException('Não autenticado.');
    }
    final filtros = ref.watch(auditLogFiltrosProvider);
    return _fetch(filtros);
  }

  Future<AuditLogPage> _fetch(AuditLogFiltros f) async {
    final params = <String, dynamic>{
      'pagina': f.pagina,
      'por_pagina': f.porPagina,
    };
    if (f.action != null && f.action!.isNotEmpty) {
      params['action'] = f.action;
    }
    if (f.entityType != null && f.entityType!.isNotEmpty) {
      params['entity_type'] = f.entityType;
    }
    if (f.userId != null && f.userId!.isNotEmpty) {
      params['user_id'] = f.userId;
    }
    if (f.desde != null) {
      // YYYY-MM-DD — backend faz cast pra timestamptz.
      params['desde'] =
          '${f.desde!.year.toString().padLeft(4, '0')}-${f.desde!.month.toString().padLeft(2, '0')}-${f.desde!.day.toString().padLeft(2, '0')}';
    }

    final res = await ApiService.get<Map<String, dynamic>>(
      '/audit-log',
      params: params,
    );
    final data = res.data ?? const <String, dynamic>{};
    return AuditLogPage.fromJson(data);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(ref.read(auditLogFiltrosProvider)));
  }
}
