import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../../../widgets/ll_sparkline.dart';
import '../home_models.dart';

class HeroStrip extends StatelessWidget {
  const HeroStrip({super.key, required this.hero});
  final HeroSummary hero;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final pct = hero.totalCabins > 0 ? (hero.liveCount / hero.totalCabins).clamp(0.0, 1.0) : 0.0;

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: t.bgElev1,
          border: Border.all(color: t.primarySoft),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              t.primary.withValues(alpha: 0.16),
              t.primary.withValues(alpha: 0.04),
            ],
          ),
          boxShadow: t.shadowCard,
        ),
        child: Stack(
          children: [
            // Radial corner glow
            Positioned(
              top: -190,
              right: -38,
              child: IgnorePointer(
                child: Container(
                  width: 380,
                  height: 380,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [t.primary.withValues(alpha: 0.18), Colors.transparent],
                      stops: const [0.0, 0.6],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 22),
              child: LayoutBuilder(builder: (c, box) {
        final stack = box.maxWidth < 720;
        if (stack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _operationCell(t, pct),
              const SizedBox(height: 16),
              _gmvCell(t),
              const SizedBox(height: 16),
              _nextLiveCell(t),
              const SizedBox(height: 16),
              _viewersCell(t),
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 16, child: _operationCell(t, pct)),
            const SizedBox(width: 28),
            Expanded(flex: 10, child: _gmvCell(t)),
            const SizedBox(width: 28),
            Expanded(flex: 10, child: _nextLiveCell(t)),
            const SizedBox(width: 28),
            Expanded(flex: 10, child: _viewersCell(t)),
          ],
        );
      }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _eyebrow(LlTokens t, String label, {Color? color, bool dot = false}) {
    final c = color ?? t.primary;
    return Row(
      children: [
        if (dot) ...[
          Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 6),
        ],
        Text(
          label.toUpperCase(),
          style: TextStyle(
            color: c,
            fontSize: 10,
            letterSpacing: 1.4,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _operationCell(LlTokens t, double pct) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _eyebrow(t, 'Operação ao vivo', dot: true),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${hero.liveCount}',
              style: TextStyle(
                color: t.textPrimary,
                fontSize: 44,
                fontWeight: FontWeight.w700,
                height: 1,
                letterSpacing: -1.3,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(width: 6),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                '/ ${hero.totalCabins}',
                style: TextStyle(
                  color: t.textMuted,
                  fontSize: 22,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'cabines transmitindo agora',
          style: TextStyle(color: t.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 12),
        Container(
          height: 6,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(3),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: pct,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [t.primary, const Color(0xFFFF8A3C)]),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _gmvCell(LlTokens t) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _eyebrow(t, 'GMV do mês', color: t.textMuted),
        const SizedBox(height: 10),
        Text(
          hero.gmvMes,
          style: TextStyle(
            color: t.textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 4),
        if (hero.gmvDelta.isNotEmpty)
          _delta(t, hero.gmvDelta, hero.gmvDeltaPositive),
        if (hero.gmvSpark.isNotEmpty) ...[
          const SizedBox(height: 10),
          LlSparkline(values: hero.gmvSpark, color: t.primary, height: 32),
        ],
      ],
    );
  }

  Widget _nextLiveCell(LlTokens t) {
    final hasNext = hero.nextLiveTime != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _eyebrow(t, 'Próxima live', color: t.textMuted),
        const SizedBox(height: 10),
        Text(
          hasNext ? hero.nextLiveTime! : '—',
          style: TextStyle(
            color: t.textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          hasNext
              ? '${hero.nextLiveCabin ?? ""} · ${hero.nextLiveClient ?? ""}'
              : 'Nenhuma agendada',
          style: TextStyle(color: t.textMuted, fontSize: 12),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        if (hasNext && hero.nextLiveStartsIn != null) ...[
          const SizedBox(height: 8),
          Text(
            hero.nextLiveStartsIn!,
            style: TextStyle(color: t.primary, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ],
    );
  }

  Widget _viewersCell(LlTokens t) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _eyebrow(t, 'Espectadores agora', color: t.textMuted),
        const SizedBox(height: 10),
        Text(
          _formatInt(hero.viewersNow),
          style: TextStyle(
            color: t.textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 4),
        if (hero.peakOfDay)
          _flameDelta(t, 'pico do dia'),
        if (hero.salesNow > 0) ...[
          const SizedBox(height: 8),
          Text(
            'R\$ ${_formatThousands(hero.salesNow.round())} em vendas ao vivo',
            style: TextStyle(color: t.textMuted, fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _delta(LlTokens t, String text, bool positive) {
    final color = positive ? t.success : t.danger;
    final bg = positive ? t.successSoft : t.dangerSoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            positive ? Icons.trending_up : Icons.trending_down,
            size: 11,
            color: color,
          ),
          const SizedBox(width: 3),
          Text(
            text,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _flameDelta(LlTokens t, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: t.successSoft,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.local_fire_department, size: 11, color: t.success),
          const SizedBox(width: 3),
          Text(label, style: TextStyle(color: t.success, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  static String _formatInt(int v) {
    final s = v.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  static String _formatThousands(int v) => _formatInt(v);
}
