import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../../../widgets/ll_card.dart';

class ScheduleEntry {
  const ScheduleEntry({required this.time, required this.title, required this.subtitle, this.now = false});
  final String time;
  final String title;
  final String subtitle;
  final bool now;
}

class ScheduleTimeline extends StatelessWidget {
  const ScheduleTimeline({super.key, required this.entries, this.range = '14:30 → 18:30'});
  final List<ScheduleEntry> entries;
  final String range;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return LlCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('Próximas 4h', style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(range, style: TextStyle(color: t.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: LlSpacing.md),
          ...entries.map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 44,
                      child: Text(
                        e.time,
                        style: TextStyle(
                          color: t.textMuted,
                          fontSize: 10,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(LlSpacing.sm),
                        decoration: BoxDecoration(
                          color: e.now ? t.primarySoft : t.bgElev2,
                          borderRadius: BorderRadius.circular(LlRadius.sm),
                          border: Border.all(color: e.now ? t.primary : Colors.transparent),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              e.title,
                              style: TextStyle(
                                color: e.now ? t.primary : t.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(e.subtitle, style: TextStyle(color: t.textMuted, fontSize: 10)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
