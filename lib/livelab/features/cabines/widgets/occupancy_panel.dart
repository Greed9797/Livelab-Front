import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../../../core/format.dart';
import '../../../widgets/ll_card.dart';
import '../../../widgets/ll_donut.dart';
import '../cabines_models.dart';

class OccupancyPanel extends StatelessWidget {
  const OccupancyPanel({super.key, required this.cabins});
  final List<Cabin> cabins;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final live = cabins.where((c) => c.status == CabinStatus.live).length;
    final busy = cabins.where((c) => c.status == CabinStatus.busy).length;
    final free = cabins.where((c) => c.status == CabinStatus.free).length;
    final maint = cabins.where((c) => c.status == CabinStatus.maint).length;
    final totalViews = cabins.fold<int>(0, (a, b) => a + b.views);
    final totalGmv = cabins.fold<double>(0, (a, b) => a + b.gmv);

    return LlCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('Ocupação agora', style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(
                'TEMPO REAL',
                style: TextStyle(color: t.primary, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.6),
              ),
            ],
          ),
          const SizedBox(height: LlSpacing.lg),
          Center(
            child: LlDonut(
              segments: [
                LlDonutSegment(value: live.toDouble(), color: t.primary),
                LlDonutSegment(value: busy.toDouble(), color: t.info),
                LlDonutSegment(value: free.toDouble(), color: t.success),
                LlDonutSegment(value: maint.toDouble(), color: t.warning),
              ],
              centerLabel: '$live de ${cabins.length}',
              centerSubtitle: 'AO VIVO',
            ),
          ),
          const SizedBox(height: LlSpacing.lg),
          _legend(t, color: t.primary, count: live, label: 'Ao vivo'),
          _legend(t, color: t.info, count: busy, label: 'Preparando'),
          _legend(t, color: t.success, count: free, label: 'Livres'),
          _legend(t, color: t.warning, count: maint, label: 'Manutenção'),
          const SizedBox(height: LlSpacing.md),
          Container(height: 1, color: t.hairline),
          const SizedBox(height: LlSpacing.md),
          Row(
            children: [
              Expanded(child: _summary(t, label: 'Espectadores', value: LlFormat.integer(totalViews))),
              Expanded(
                child: _summary(
                  t,
                  label: 'GMV agora',
                  value: 'R\$ ${(totalGmv / 1000).toStringAsFixed(1)}k',
                  color: t.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legend(LlTokens t, {required Color color, required int count, required String label}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Text(
            count.toString(),
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: 6),
          Expanded(child: Text(label, style: TextStyle(color: t.textSecondary, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _summary(LlTokens t, {required String label, required String value, Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(color: t.textMuted, fontSize: 10, letterSpacing: 0.6, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: color ?? t.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.4,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
