import 'package:flutter/material.dart';
import '../theme/livelab_theme.dart';

class LlMetricTile extends StatelessWidget {
  const LlMetricTile({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    this.deltaPositive = true,
    this.valueColor,
  });

  final String label;
  final String value;
  final String? delta;
  final bool deltaPositive;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            color: t.textMuted,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? t.textPrimary,
            fontSize: 22,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        if (delta != null) ...[
          const SizedBox(height: 4),
          Text(
            delta!,
            style: TextStyle(
              color: deltaPositive ? t.success : t.danger,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
  }
}
