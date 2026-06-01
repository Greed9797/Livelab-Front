import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../home_models.dart';

class RankingPanel extends StatelessWidget {
  const RankingPanel({super.key, required this.entries, this.onSeeAll});
  final List<RankingEntry> entries;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final maxGmv = entries.isEmpty
        ? 1.0
        : entries.map((e) => e.gmv).reduce((a, b) => a > b ? a : b);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: t.border),
        boxShadow: t.shadowCard,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.emoji_events_outlined, size: 18, color: t.primary),
              const SizedBox(width: 8),
              Text(
                'Ranking do dia',
                style: TextStyle(color: t.textPrimary, fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.2),
              ),
              const Spacer(),
              if (onSeeAll != null)
                GestureDetector(
                  onTap: onSeeAll,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Ver completo', style: TextStyle(color: t.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_forward, size: 14, color: t.primary),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 2),
          Padding(
            padding: const EdgeInsets.only(left: 26),
            child: Text(
              'apresentadoras com maior GMV hoje',
              style: TextStyle(color: t.textMuted, fontSize: 11),
            ),
          ),
          const SizedBox(height: 14),
          if (entries.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Sem ranking disponível ainda',
                  style: TextStyle(color: t.textFaint, fontSize: 12, fontStyle: FontStyle.italic),
                ),
              ),
            )
          else
            for (var i = 0; i < entries.length; i++)
              _row(t, entries[i], maxGmv, first: i == 0),
        ],
      ),
    );
  }

  Widget _row(LlTokens t, RankingEntry e, double maxGmv, {required bool first}) {
    final isMedal = e.position <= 3;
    final medalGradient = switch (e.position) {
      1 => const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFC93C), Color(0xFFFF9F1C)]),
      2 => const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFD8D8D8), Color(0xFFA8A8A8)]),
      3 => const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFD49664), Color(0xFFB07042)]),
      _ => null,
    };
    final medalText = switch (e.position) {
      1 => const Color(0xFF3D2200),
      2 => const Color(0xFF2A2A2A),
      3 => const Color(0xFF2A1500),
      _ => t.textSecondary,
    };
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: t.hairline)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              gradient: medalGradient,
              color: medalGradient == null ? t.bgElev2 : null,
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: Text(
              e.position.toString(),
              style: TextStyle(
                color: isMedal ? medalText : t.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e.name,
                  style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '${e.lives} live${e.lives > 1 ? 's' : ''} · ${e.orders} pedidos',
                  style: TextStyle(color: t.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: (e.gmv / maxGmv).clamp(0.0, 1.0),
                    backgroundColor: t.bgElev2,
                    valueColor: AlwaysStoppedAnimation(t.primary),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'R\$ ${_formatThousands(e.gmv.round())}',
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatThousands(int v) {
    final s = v.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}
