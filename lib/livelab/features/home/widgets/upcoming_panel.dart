import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../home_models.dart';

class UpcomingPanel extends StatelessWidget {
  const UpcomingPanel({super.key, required this.upcoming, this.liveCount = 0, this.totalScheduled = 0, this.onSeeAll});
  final List<UpcomingLive> upcoming;
  final int liveCount;
  final int totalScheduled;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
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
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Próximas lives do dia',
                      style: TextStyle(color: t.textPrimary, fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$liveCount ao vivo · $totalScheduled agendadas até o fim do dia',
                      style: TextStyle(color: t.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              GestureDetector(
                onTap: onSeeAll,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Agenda completa',
                      style: TextStyle(color: t.primary, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_forward, size: 14, color: t.primary),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (upcoming.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Nenhuma live agendada para hoje',
                  style: TextStyle(color: t.textFaint, fontSize: 12, fontStyle: FontStyle.italic),
                ),
              ),
            )
          else
            for (var i = 0; i < upcoming.length; i++)
              _row(t, upcoming[i], first: i == 0),
        ],
      ),
    );
  }

  Widget _row(LlTokens t, UpcomingLive u, {required bool first}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: t.hairline)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 56,
            child: Column(
              children: [
                Text(
                  u.time,
                  style: TextStyle(
                    color: t.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.4,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  u.status == UpcomingStatus.now ? 'AGORA' : (u.duration ?? ''),
                  style: TextStyle(
                    color: u.status == UpcomingStatus.now ? t.primary : t.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: u.status == UpcomingStatus.now ? 0.6 : 0,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  u.client,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: t.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: t.primary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        'CABINE ${u.cabin.toString().padLeft(2, '0')}',
                        style: TextStyle(
                          color: t.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        u.viewers != null
                            ? '· ${u.presenter} · ${_compactViewers(u.viewers!)} espectadores'
                            : '· ${u.presenter}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: t.textMuted, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _statusPill(t, u.status),
        ],
      ),
    );
  }

  Widget _statusPill(LlTokens t, UpcomingStatus s) {
    switch (s) {
      case UpcomingStatus.now:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: t.primary,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
              const SizedBox(width: 5),
              const Text(
                'AO VIVO',
                style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5),
              ),
            ],
          ),
        );
      case UpcomingStatus.warming:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: t.warningSoft,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            'Pré-live',
            style: TextStyle(color: t.warning, fontSize: 10, fontWeight: FontWeight.w600),
          ),
        );
      case UpcomingStatus.scheduled:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: t.infoSoft,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            'Agendada',
            style: TextStyle(color: t.info, fontSize: 10, fontWeight: FontWeight.w600),
          ),
        );
    }
  }

  static String _compactViewers(int v) {
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}k';
    return v.toString();
  }
}
