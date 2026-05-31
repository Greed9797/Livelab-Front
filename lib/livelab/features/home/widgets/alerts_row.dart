import 'package:flutter/material.dart';
import '../../../theme/livelab_theme.dart';
import '../home_models.dart';

class AlertsRow extends StatelessWidget {
  const AlertsRow({super.key, required this.alerts, this.onAlertTap});
  final List<HomeAlert> alerts;
  final void Function(int index)? onAlertTap;

  @override
  Widget build(BuildContext context) {
    if (alerts.isEmpty) {
      final t = context.llTokens;
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: t.bgElev1,
          border: Border.all(color: t.border),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_outline, color: t.success, size: 18),
            const SizedBox(width: 10),
            Text('Tudo em dia · sem alertas', style: TextStyle(color: t.textMuted, fontSize: 13)),
          ],
        ),
      );
    }
    return LayoutBuilder(builder: (c, box) {
      final cols = box.maxWidth < 720 ? 1 : (alerts.length < 3 ? alerts.length : 3);
      return GridView.builder(
        primary: false,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 86,
        ),
        itemCount: alerts.length,
        itemBuilder: (_, i) => _AlertCard(alert: alerts[i], onTap: onAlertTap == null ? null : () => onAlertTap!(i)),
      );
    });
  }
}

class _AlertCard extends StatelessWidget {
  const _AlertCard({required this.alert, this.onTap});
  final HomeAlert alert;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final (color, bg, icon) = switch (alert.severity) {
      HomeAlertSeverity.danger => (t.danger, t.dangerSoft, Icons.error_outline),
      HomeAlertSeverity.warning => (t.warning, t.warningSoft, Icons.warning_amber_outlined),
      HomeAlertSeverity.info => (t.info, t.infoSoft, Icons.info_outline),
      HomeAlertSeverity.success => (t.success, t.successSoft, Icons.check_circle_outline),
    };

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: t.bgElev1,
          border: Border.all(color: t.border),
          boxShadow: t.shadowCard,
        ),
        child: Row(
          children: [
            Container(width: 3, color: color),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: bg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, size: 18, color: color),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            alert.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: t.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            alert.subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: t.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    if (alert.count != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        alert.count.toString(),
                        style: TextStyle(
                          color: color,
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.4,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
        ),
      ),
    );
  }
}
