import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_article.dart';
import 'panda_iframe.dart';

/// Bloco de vídeo embed para um artigo da Knowledge Base.
///
/// - YouTube: embed via youtube_player_iframe
/// - Panda: WebView dificil em Flutter Web → fallback "Abrir no Panda"
/// - none/null: nada renderizado
class VideoBlock extends StatelessWidget {
  final KbVideoProvider provider;
  final String? url;

  const VideoBlock({
    super.key,
    required this.provider,
    required this.url,
  });

  @override
  Widget build(BuildContext context) {
    if (provider == KbVideoProvider.none) return const SizedBox.shrink();
    final videoUrl = url?.trim();
    if (videoUrl == null || videoUrl.isEmpty) return const SizedBox.shrink();

    Widget content;
    switch (provider) {
      case KbVideoProvider.youtube:
        content = _YouTubeEmbed(url: videoUrl);
        break;
      case KbVideoProvider.panda:
        content = _PandaFallback(url: videoUrl);
        break;
      case KbVideoProvider.none:
        return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x6),
      child: AppCard(
        padding: EdgeInsets.zero,
        child: ClipRRect(
          borderRadius: AppRadius.xlR,
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: content,
          ),
        ),
      ),
    );
  }
}

class _YouTubeEmbed extends StatefulWidget {
  final String url;
  const _YouTubeEmbed({required this.url});

  @override
  State<_YouTubeEmbed> createState() => _YouTubeEmbedState();
}

class _YouTubeEmbedState extends State<_YouTubeEmbed> {
  YoutubePlayerController? _controller;
  String? _videoId;

  @override
  void initState() {
    super.initState();
    _videoId = YoutubePlayerController.convertUrlToId(widget.url);
    if (_videoId != null) {
      _controller = YoutubePlayerController.fromVideoId(
        videoId: _videoId!,
        autoPlay: false,
        params: const YoutubePlayerParams(
          showControls: true,
          showFullscreenButton: true,
          strictRelatedVideos: true,
        ),
      );
    }
  }

  @override
  void dispose() {
    _controller?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null || _videoId == null) {
      return _UnavailableEmbed(
        url: widget.url,
        message: 'URL do YouTube inválida',
      );
    }
    return YoutubePlayer(controller: controller);
  }
}

class _PandaFallback extends StatelessWidget {
  final String url;
  const _PandaFallback({required this.url});

  @override
  Widget build(BuildContext context) {
    // No Flutter Web, embedamos via HtmlElementView (iframe nativo).
    // Em mobile/desktop, mostramos fallback "Abrir no Panda".
    if (kIsWeb) {
      return PandaIframeView(url: url);
    }
    return Container(
      color: AppColors.bgMuted,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: AppRadius.fullR,
              boxShadow: AppShadows.sm,
            ),
            child: Icon(
              PhosphorIcons.playCircle(),
              color: AppColors.primary,
              size: 32,
            ),
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(
            'Vídeo hospedado no Panda',
            style: AppTypography.h4.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.x2),
          Text(
            'Toque para abrir o vídeo no Panda.',
            style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.x4),
          AppPrimaryButton(
            label: 'Abrir no Panda',
            icon: PhosphorIcons.arrowSquareOut(),
            onPressed: () async {
              final uri = Uri.tryParse(url);
              if (uri == null) return;
              try {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } catch (_) {/* ignore */}
            },
          ),
        ],
      ),
    );
  }
}

class _UnavailableEmbed extends StatelessWidget {
  final String url;
  final String message;
  const _UnavailableEmbed({required this.url, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.bgMuted,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(PhosphorIcons.warningCircle(),
              color: AppColors.warning, size: 28),
          const SizedBox(height: AppSpacing.x2),
          Text(
            message,
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.x3),
          AppGhostButton(
            label: 'Abrir link',
            icon: PhosphorIcons.arrowSquareOut(),
            onPressed: () async {
              final uri = Uri.tryParse(url);
              if (uri == null) return;
              try {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } catch (_) {/* ignore */}
            },
          ),
        ],
      ),
    );
  }
}
