import 'package:flutter/material.dart';
import '../../../theme/livelab_theme.dart';

class SectionLabel extends StatelessWidget {
  const SectionLabel({super.key, required this.label, this.trailing});
  final String label;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label.toUpperCase(),
              style: TextStyle(
                color: t.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.1,
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class SectionAllLink extends StatelessWidget {
  const SectionAllLink({super.key, required this.label, this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return InkWell(
      onTap: onTap,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(color: t.primary, fontSize: 12, fontWeight: FontWeight.w600),
          ),
          const SizedBox(width: 4),
          Icon(Icons.arrow_forward, size: 14, color: t.primary),
        ],
      ),
    );
  }
}
