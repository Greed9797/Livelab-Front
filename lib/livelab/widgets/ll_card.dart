import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/livelab_theme.dart';

class LlCard extends StatelessWidget {
  const LlCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(LlSpacing.lg),
    this.elevated = true,
    this.borderColor,
    this.background,
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool elevated;
  final Color? borderColor;
  final Color? background;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: background ?? t.bgElev1,
        borderRadius: BorderRadius.circular(LlRadius.lg),
        border: Border.all(color: borderColor ?? t.border),
        boxShadow: elevated ? t.shadowCard : null,
      ),
      child: child,
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(LlRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(LlRadius.lg),
        onTap: onTap,
        child: card,
      ),
    );
  }
}
