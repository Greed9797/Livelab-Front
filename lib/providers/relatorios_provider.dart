// lib/providers/relatorios_provider.dart
// F2 — Provider de exportação de relatórios CSV / PDF.
// Faz download via ApiService.downloadBytes (Dio + ResponseType.bytes) e
// dispara o download no browser usando package:web (Anchor + Blob).

import 'dart:js_interop';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web/web.dart' as web;

import '../services/api_service.dart';

class RelatoriosState {
  final bool isExporting;
  final String? error;
  final String? lastFilename;

  const RelatoriosState({
    this.isExporting = false,
    this.error,
    this.lastFilename,
  });

  RelatoriosState copyWith({
    bool? isExporting,
    String? error,
    String? lastFilename,
    bool clearError = false,
  }) =>
      RelatoriosState(
        isExporting: isExporting ?? this.isExporting,
        error: clearError ? null : (error ?? this.error),
        lastFilename: lastFilename ?? this.lastFilename,
      );
}

class RelatoriosNotifier extends Notifier<RelatoriosState> {
  @override
  RelatoriosState build() => const RelatoriosState();

  Future<void> downloadFinanceiroCSV(String periodo) async {
    await _download(
      path: '/relatorios/financeiro/csv',
      params: {'periodo': periodo},
      fallbackFilename: 'financeiro-$periodo.csv',
      fallbackMime: 'text/csv;charset=utf-8',
    );
  }

  Future<void> downloadClientePDF(String clienteId, String periodo) async {
    await _download(
      path: '/relatorios/cliente/$clienteId/pdf',
      params: {'periodo': periodo},
      fallbackFilename: 'cliente-$clienteId-$periodo.pdf',
      fallbackMime: 'application/pdf',
    );
  }

  Future<void> downloadBoletosCSV(String status, String periodo) async {
    await _download(
      path: '/relatorios/boletos/csv',
      params: {
        if (status.isNotEmpty) 'status': status,
        'periodo': periodo,
      },
      fallbackFilename: 'boletos-${status.isEmpty ? 'todos' : status}-$periodo.csv',
      fallbackMime: 'text/csv;charset=utf-8',
    );
  }

  Future<void> _download({
    required String path,
    required Map<String, dynamic> params,
    required String fallbackFilename,
    required String fallbackMime,
  }) async {
    state = state.copyWith(isExporting: true, clearError: true);
    try {
      final result = await ApiService.downloadBytes(path, params: params);
      final filename = result.filename ?? fallbackFilename;
      final contentType = result.contentType ?? fallbackMime;
      _triggerBrowserDownload(result.bytes, filename, contentType);
      state = state.copyWith(isExporting: false, lastFilename: filename);
    } catch (e) {
      state = state.copyWith(
        isExporting: false,
        error: ApiService.extractErrorMessage(e),
      );
      rethrow;
    }
  }

  void _triggerBrowserDownload(
      Uint8List bytes, String filename, String mimeType) {
    if (!kIsWeb) {
      // Mobile/desktop: implementação futura (path_provider + share_plus).
      // Por enquanto, só web — registramos warn no console.
      debugPrint('[relatorios] download solicitado fora da web — ignorado');
      return;
    }
    // Cria Blob → URL → Anchor click → revoga URL.
    final blob = web.Blob(
      [bytes.toJS].toJS,
      web.BlobPropertyBag(type: mimeType),
    );
    final url = web.URL.createObjectURL(blob);
    final anchor = web.HTMLAnchorElement()
      ..href = url
      ..download = filename
      ..style.display = 'none';
    web.document.body?.appendChild(anchor);
    anchor.click();
    anchor.remove();
    web.URL.revokeObjectURL(url);
  }
}

final relatoriosProvider =
    NotifierProvider<RelatoriosNotifier, RelatoriosState>(
  RelatoriosNotifier.new,
);
