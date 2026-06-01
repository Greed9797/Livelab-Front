import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:url_launcher/url_launcher.dart';

import '../../design_system/design_system.dart';

/// Renderiza Markdown com tipografia do Design System Livelab.
///
/// - Suporta GitHub Flavored Markdown (tabelas, strikethrough, fenced code)
/// - Links abrem em browser externo via url_launcher
/// - Texto selecionável
class MarkdownRenderer extends StatelessWidget {
  final String data;
  final EdgeInsetsGeometry? padding;
  final bool selectable;

  const MarkdownRenderer({
    super.key,
    required this.data,
    this.padding,
    this.selectable = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final styleSheet = MarkdownStyleSheet(
      h1: AppTypography.h1.copyWith(color: AppColors.textPrimary),
      h2: AppTypography.h2.copyWith(color: AppColors.textPrimary),
      h3: AppTypography.h3.copyWith(color: AppColors.textPrimary),
      h4: AppTypography.h4.copyWith(color: AppColors.textPrimary),
      h5: AppTypography.h4.copyWith(color: AppColors.textPrimary),
      h6: AppTypography.label.copyWith(color: AppColors.textPrimary),
      h1Padding: const EdgeInsets.only(top: AppSpacing.x6, bottom: AppSpacing.x3),
      h2Padding: const EdgeInsets.only(top: AppSpacing.x6, bottom: AppSpacing.x3),
      h3Padding: const EdgeInsets.only(top: AppSpacing.x5, bottom: AppSpacing.x2),
      h4Padding: const EdgeInsets.only(top: AppSpacing.x4, bottom: AppSpacing.x2),
      p: AppTypography.bodyLarge.copyWith(
        color: AppColors.textPrimary,
        height: 1.7,
      ),
      pPadding: const EdgeInsets.only(bottom: AppSpacing.x3),
      listBullet: AppTypography.bodyLarge.copyWith(
        color: AppColors.textPrimary,
        height: 1.7,
      ),
      listBulletPadding: const EdgeInsets.only(right: AppSpacing.x2),
      blockSpacing: AppSpacing.x3,
      blockquote: AppTypography.bodyLarge.copyWith(
        color: AppColors.textSecondary,
        fontStyle: FontStyle.italic,
        height: 1.6,
      ),
      blockquoteDecoration: BoxDecoration(
        color: AppColors.bgMuted,
        borderRadius: AppRadius.smR,
        border: const Border(
          left: BorderSide(color: AppColors.primary, width: 3),
        ),
      ),
      blockquotePadding: const EdgeInsets.fromLTRB(
        AppSpacing.x4,
        AppSpacing.x3,
        AppSpacing.x4,
        AppSpacing.x3,
      ),
      a: AppTypography.bodyLarge.copyWith(
        color: AppColors.primary,
        decoration: TextDecoration.underline,
        decorationColor: AppColors.primary.withValues(alpha: 0.4),
      ),
      code: AppTypography.bodySmall.copyWith(
        fontFamily: 'monospace',
        backgroundColor: AppColors.bgMuted,
        color: AppColors.textPrimary,
      ),
      codeblockDecoration: BoxDecoration(
        color: AppColors.bgMuted,
        borderRadius: AppRadius.mdR,
        border: Border.all(color: AppColors.borderLight),
      ),
      codeblockPadding: const EdgeInsets.all(AppSpacing.x4),
      tableHead: AppTypography.label.copyWith(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w600,
      ),
      tableBody: AppTypography.bodyMedium.copyWith(
        color: AppColors.textPrimary,
      ),
      tableBorder: TableBorder.all(
        color: AppColors.borderLight,
        width: 1,
      ),
      tableHeadAlign: TextAlign.left,
      tableCellsPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x2,
      ),
      horizontalRuleDecoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      img: AppTypography.bodyMedium,
      checkbox: AppTypography.bodyMedium,
      strong: AppTypography.bodyLarge.copyWith(
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w700,
        height: 1.7,
      ),
      em: AppTypography.bodyLarge.copyWith(
        color: AppColors.textPrimary,
        fontStyle: FontStyle.italic,
        height: 1.7,
      ),
    );

    final body = MarkdownBody(
      data: data,
      selectable: selectable,
      shrinkWrap: true,
      fitContent: false,
      styleSheet: styleSheet,
      extensionSet: md.ExtensionSet.gitHubFlavored,
      onTapLink: (text, href, title) async {
        if (href == null || href.isEmpty) return;
        final uri = Uri.tryParse(href);
        if (uri == null) return;
        try {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } catch (_) {
          // ignore — fail silently no UI
        }
      },
      imageBuilder: (uri, title, alt) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.x3),
          child: ClipRRect(
            borderRadius: AppRadius.mdR,
            child: Image.network(
              uri.toString(),
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 120,
                color: AppColors.bgMuted,
                alignment: Alignment.center,
                child: Text(
                  alt ?? 'Imagem indisponível',
                  style: AppTypography.bodySmall
                      .copyWith(color: AppColors.textMuted),
                ),
              ),
            ),
          ),
        );
      },
    );

    final wrapped = padding != null
        ? Padding(padding: padding!, child: body)
        : body;

    // Theme override to keep DefaultTextStyle within MarkdownBody compatible.
    return DefaultTextStyle.merge(
      style: AppTypography.bodyLarge.copyWith(color: AppColors.textPrimary),
      child: Theme(
        data: theme,
        child: wrapped,
      ),
    );
  }
}
