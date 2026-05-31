// Stub não-web do PandaIframeView. Em mobile/desktop renderizamos vazio,
// e o caller (VideoBlock) faz fallback automático.
import 'package:flutter/material.dart';

String normalizePandaUrl(String raw) => raw.trim();

class PandaIframeView extends StatelessWidget {
  final String url;
  const PandaIframeView({super.key, required this.url});

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
