// Panda Video iframe embed (Flutter Web only).
//
// Registra um <iframe> via platformViewRegistry para cada URL única, usando
// HtmlElementView para incorporar no widget tree.
//
// O backend pode entregar dois formatos:
//   1. URL completa do player Panda já com /embed/?v=ID (player-vz-XXX.tv.pandavideo.com.br)
//   2. URL "raw" (ex.: https://app.pandavideo.com.br/videos/<id>) → tentamos converter.
import 'dart:ui_web' as ui_web;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

/// Normaliza qualquer formato razoável de URL Panda para o formato embed.
String normalizePandaUrl(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return trimmed;
  // Já está no formato embed (player-vz-*.tv.pandavideo.com.br/embed/?v=XYZ)
  if (trimmed.contains('/embed/') && trimmed.contains('pandavideo.com.br')) {
    return trimmed;
  }
  // Tenta extrair ID após /videos/
  final uri = Uri.tryParse(trimmed);
  if (uri == null) return trimmed;
  final segs = uri.pathSegments;
  final idx = segs.indexOf('videos');
  if (idx >= 0 && idx + 1 < segs.length) {
    final id = segs[idx + 1];
    // Sem subdomínio player-vz-XXX explícito, usamos a forma genérica
    return 'https://player.pandavideo.com.br/embed/?v=$id';
  }
  return trimmed;
}

/// HtmlElementView que renderiza um iframe do Panda Video.
class PandaIframeView extends StatelessWidget {
  final String url;
  const PandaIframeView({super.key, required this.url});

  static final Set<String> _registered = <String>{};

  String get _viewType {
    // identificador estável + único por URL (hash)
    final h = url.hashCode.toUnsigned(32).toRadixString(16);
    return 'kb-panda-iframe-$h';
  }

  void _ensureRegistered() {
    if (_registered.contains(_viewType)) return;
    final embedUrl = normalizePandaUrl(url);
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = web.HTMLIFrameElement()
        ..src = embedUrl
        ..style.border = '0'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow =
            'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture'
        ..allowFullscreen = true
        ..setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
        ..setAttribute('loading', 'lazy');
      return iframe;
    });
    _registered.add(_viewType);
  }

  @override
  Widget build(BuildContext context) {
    if (!kIsWeb) return const SizedBox.shrink();
    _ensureRegistered();
    return HtmlElementView(viewType: _viewType);
  }
}
