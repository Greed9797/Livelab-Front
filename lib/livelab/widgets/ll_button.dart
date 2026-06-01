import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/livelab_theme.dart';

enum LlButtonVariant { primary, secondary, ghost }

class LlButton extends StatelessWidget {
  const LlButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.variant = LlButtonVariant.primary,
    this.compact = false,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final LlButtonVariant variant;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final (bg, fg, border) = switch (variant) {
      LlButtonVariant.primary => (t.primary, Colors.white, Colors.transparent),
      LlButtonVariant.secondary => (t.bgElev2, t.textPrimary, t.border),
      LlButtonVariant.ghost => (Colors.transparent, t.textSecondary, t.border),
    };
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(LlRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(LlRadius.md),
        onTap: onPressed,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: compact ? LlSpacing.md : LlSpacing.lg,
            vertical: compact ? LlSpacing.sm : LlSpacing.md,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(LlRadius.md),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: compact ? 14 : 16, color: fg),
                const SizedBox(width: LlSpacing.sm),
              ],
              Text(
                label,
                style: TextStyle(
                  color: fg,
                  fontWeight: FontWeight.w600,
                  fontSize: compact ? 12 : 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
