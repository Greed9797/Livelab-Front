import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../design_system/design_system.dart';

class EmptyStateWidget extends StatelessWidget {
  final String message;
  final String? title;
  final IconData? icon;
  final String? actionLabel;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  const EmptyStateWidget({
    super.key,
    required this.message,
    this.title,
    this.icon,
    this.actionLabel,
    this.onAction,
    this.padding = const EdgeInsets.all(AppSpacing.x6),
  });

  @override
  Widget build(BuildContext context) {
    final iconData = icon ?? PhosphorIcons.tray();
    final muted = context.colors.textMuted;
    final secondary = context.colors.textSecondary;
    final hasAction = actionLabel != null && onAction != null;

    return Center(
      child: Padding(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(iconData, size: 56, color: muted),
            const SizedBox(height: AppSpacing.x4),
            if (title != null) ...[
              Text(
                title!,
                style: AppTypography.bodyLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: context.colors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.x2),
            ],
            Text(
              message,
              style: AppTypography.bodySmall.copyWith(color: secondary),
              textAlign: TextAlign.center,
            ),
            if (hasAction) ...[
              const SizedBox(height: AppSpacing.x4),
              OutlinedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
