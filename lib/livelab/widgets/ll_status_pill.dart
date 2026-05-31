import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/livelab_theme.dart';

enum LlStatusKind { live, busy, free, maint, info, neutral }

class LlStatusPill extends StatelessWidget {
  const LlStatusPill({super.key, required this.kind, required this.label, this.dot = false});

  final LlStatusKind kind;
  final String label;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final (bg, fg) = switch (kind) {
      LlStatusKind.live => (t.primarySoft, t.primary),
      LlStatusKind.busy => (t.infoSoft, t.info),
      LlStatusKind.free => (t.successSoft, t.success),
      LlStatusKind.maint => (t.warningSoft, t.warning),
      LlStatusKind.info => (t.infoSoft, t.info),
      LlStatusKind.neutral => (t.bgElev2, t.textMuted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(LlRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}
