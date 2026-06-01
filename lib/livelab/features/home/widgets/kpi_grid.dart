import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../home_models.dart';

class KpiGrid extends StatelessWidget {
  const KpiGrid({super.key, required this.kpis, this.onKpiTap});
  final List<HomeKpi> kpis;
  final void Function(int index)? onKpiTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (c, box) {
      final cols = box.maxWidth < 720 ? 2 : 4;
      return GridView.builder(
        primary: false,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 116,
        ),
        itemCount: kpis.length,
        itemBuilder: (_, i) => _KpiCard(kpi: kpis[i], onTap: onKpiTap == null ? null : () => onKpiTap!(i)),
      );
    });
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.kpi, this.onTap});
  final HomeKpi kpi;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final iconBg = kpi.primaryIcon ? t.primarySoft : t.bgElev2;
    final iconFg = kpi.primaryIcon ? t.primary : t.textSecondary;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: t.bgElev1,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: t.border),
            boxShadow: t.shadowCard,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      kpi.label,
                      style: TextStyle(color: t.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ),
                  if (kpi.icon != null)
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: iconBg,
                        borderRadius: BorderRadius.circular(9),
                      ),
                      child: Icon(kpi.icon, size: 16, color: iconFg),
                    ),
                ],
              ),
              Text(
                kpi.value,
                style: TextStyle(
                  color: t.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.7,
                  height: 1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Row(
                children: [
                  if (kpi.delta.isNotEmpty) ...[
                    _delta(t, kpi.delta, kpi.deltaPositive),
                    const SizedBox(width: 6),
                  ],
                  if (kpi.footnote != null)
                    Expanded(
                      child: Text(
                        kpi.footnote!,
                        style: TextStyle(color: t.textMuted, fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _delta(LlTokens t, String text, bool positive) {
    final color = positive ? t.success : t.danger;
    final bg = positive ? t.successSoft : t.dangerSoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(positive ? Icons.trending_up : Icons.trending_down, size: 10, color: color),
          const SizedBox(width: 3),
          Text(
            text,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
