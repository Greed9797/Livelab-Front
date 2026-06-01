import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../livelab/theme/livelab_theme.dart';
import '../widgets/app_scaffold.dart';

class AppScreenScaffold extends StatelessWidget {
  final String currentRoute;
  final String? title;
  final String? subtitle;
  final Widget child;
  final List<Widget>? actions;
  final String? eyebrow;
  final bool titleSerif;

  const AppScreenScaffold({
    super.key,
    required this.currentRoute,
    required this.child,
    this.title,
    this.subtitle,
    this.actions,
    this.eyebrow,
    this.titleSerif = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return AppScaffold(
      currentRoute: currentRoute,
      child: Container(
        color: t.bgBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title != null)
              _ScreenHeader(
                title: title!,
                subtitle: subtitle,
                actions: actions,
                eyebrow: eyebrow,
                titleSerif: titleSerif,
              ),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

class _ScreenHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final String? eyebrow;
  final bool titleSerif;

  const _ScreenHeader({
    required this.title,
    this.subtitle,
    this.actions,
    this.eyebrow,
    this.titleSerif = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(28, 16, 28, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (eyebrow != null) ...[
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 18, height: 1, color: t.primary),
                const SizedBox(width: 8),
                Text(
                  eyebrow!.toUpperCase(),
                  style: TextStyle(
                    color: t.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.4,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: titleSerif ? _serifTitle(t) : _plainTitle(t)),
              if (actions != null) ...[
                const SizedBox(width: 12),
                ...actions!,
              ],
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              style: TextStyle(color: t.textMuted, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }

  Widget _plainTitle(t) {
    return Text(
      title,
      style: TextStyle(
        color: t.textPrimary,
        fontSize: 32,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.9,
        height: 1.1,
      ),
    );
  }

  Widget _serifTitle(t) {
    final words = title.trim().split(' ');
    if (words.isEmpty) return const SizedBox.shrink();
    final firstWord = words.first;
    final rest = words.sublist(1).join(' ');

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: firstWord,
            style: GoogleFonts.getFont(
              'Instrument Serif',
              fontSize: 32,
              letterSpacing: -0.6,
              fontWeight: FontWeight.w400,
              fontStyle: FontStyle.italic,
              color: t.textPrimary,
            ),
          ),
          if (rest.isNotEmpty)
            TextSpan(
              text: ' $rest',
              style: TextStyle(
                color: t.textPrimary,
                fontSize: 32,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.9,
                height: 1.1,
              ),
            ),
        ],
      ),
    );
  }
}
