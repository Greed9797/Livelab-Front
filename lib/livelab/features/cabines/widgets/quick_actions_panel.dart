import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../../../widgets/ll_card.dart';

class QuickAction {
  const QuickAction({required this.icon, required this.title, required this.subtitle, this.iconColor, this.iconBg, this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final Color? iconColor;
  final Color? iconBg;
  final VoidCallback? onTap;
}

class QuickActionsPanel extends StatelessWidget {
  const QuickActionsPanel({super.key, required this.actions});
  final List<QuickAction> actions;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return LlCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Ações rápidas', style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: LlSpacing.md),
          for (var i = 0; i < actions.length; i++) ...[
            _row(t, actions[i]),
            if (i != actions.length - 1) const SizedBox(height: LlSpacing.sm),
          ],
        ],
      ),
    );
  }

  Widget _row(LlTokens t, QuickAction a) {
    return Material(
      color: t.bgElev2,
      borderRadius: BorderRadius.circular(LlRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(LlRadius.md),
        onTap: a.onTap,
        child: Padding(
          padding: const EdgeInsets.all(LlSpacing.md),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: a.iconBg ?? t.primarySoft,
                  borderRadius: BorderRadius.circular(LlRadius.sm),
                ),
                child: Icon(a.icon, size: 16, color: a.iconColor ?? t.primary),
              ),
              const SizedBox(width: LlSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(a.title, style: TextStyle(color: t.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(a.subtitle, style: TextStyle(color: t.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward, size: 14, color: t.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
