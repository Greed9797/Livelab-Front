import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/ll_theme.dart';
import 'll_components.dart';

class AdminPageToolbar extends StatelessWidget {
  const AdminPageToolbar({
    super.key,
    required this.italic,
    this.bold,
    required this.subtitle,
    this.filters = const [],
    this.onRefresh,
  });

  final String italic;
  final String? bold;
  final String subtitle;
  final List<Widget> filters;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 880;
        final title = LLScreenHeader(label: 'Admin Master', italic: italic, bold: bold, subtitle: subtitle);
        final actions = Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            for (final filter in filters) filter,
            LLButton(label: 'Atualizar', icon: Icons.refresh_rounded, variant: LLButtonVariant.ghost, small: true, onTap: onRefresh),
          ],
        );

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [title, const SizedBox(height: 14), actions],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [Expanded(child: title), actions],
        );
      },
    );
  }
}

class AdminFilterChip extends StatelessWidget {
  const AdminFilterChip({
    super.key,
    required this.label,
    required this.value,
    this.onTap,
  });
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: context.llSurface2,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: context.llBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label.toUpperCase(),
                  style: LL.label.copyWith(
                      fontSize: 8.5,
                      letterSpacing: 0.7,
                      color: context.llTextMuted)),
              const SizedBox(height: 1),
              Text(value,
                  style: TextStyle(
                      fontSize: 12.5,
                      color: context.llTextPrimary,
                      fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(width: 10),
          Icon(Icons.keyboard_arrow_down_rounded,
              size: 17, color: context.llTextMuted),
        ],
      ),
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: body,
      ),
    );
  }
}

class AdminKpiCard extends StatelessWidget {
  const AdminKpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.sub,
    required this.icon,
    this.color = LL.accent,
    this.delta,
    this.deltaUp = true,
  });

  final String label;
  final String value;
  final String sub;
  final IconData icon;
  final Color color;
  final String? delta;
  final bool deltaUp;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.all(14),
      radius: 14,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: color.llOpacity(0.14), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 17, color: color),
              ),
              const SizedBox(width: 9),
              Expanded(child: Text(label.toUpperCase(), overflow: TextOverflow.ellipsis, style: LL.label.copyWith(fontSize: 9.5))),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: context.llTextPrimary, height: 1, letterSpacing: -0.9)),
          const SizedBox(height: 7),
          Row(
            children: [
              Expanded(child: Text(sub, overflow: TextOverflow.ellipsis, style: LL.caption.copyWith(fontSize: 11))),
              if (delta != null) LLDelta(value: delta!, up: deltaUp),
            ],
          ),
        ],
      ),
    );
  }
}

class AdminSectionHeader extends StatelessWidget {
  const AdminSectionHeader({super.key, required this.title, required this.subtitle, this.actionLabel, this.onTap});
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 22, bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: context.llTextPrimary, letterSpacing: -0.4)),
                const SizedBox(height: 3),
                Text(subtitle, style: LL.caption.copyWith(fontSize: 11.5)),
              ],
            ),
          ),
          if (actionLabel != null)
            InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Row(
                  children: [
                    Text(actionLabel!, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: LL.accent)),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_rounded, size: 14, color: LL.accent),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class RankCard extends StatelessWidget {
  const RankCard({super.key, required this.title, required this.items});
  final String title;
  final List<RankItem> items;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: context.llTextPrimary))),
              Text('TOP 3', style: LL.label.copyWith(fontSize: 9, color: context.llTextMuted)),
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < items.length; i++) ...[
            _RankRow(position: i + 1, item: items[i]),
            if (i != items.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class RankItem {
  const RankItem({required this.name, required this.value, required this.delta, this.up = true});
  final String name;
  final String value;
  final String delta;
  final bool up;
}

class _RankRow extends StatelessWidget {
  const _RankRow({required this.position, required this.item});
  final int position;
  final RankItem item;

  @override
  Widget build(BuildContext context) {
    final color = switch (position) { 1 => LL.accent, 2 => context.llTextSecond, _ => const Color(0xFFB87333) };
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: context.llSurface3.llOpacity(0.55), borderRadius: BorderRadius.circular(10), border: Border.all(color: context.llBorder)),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: color.llOpacity(0.16), borderRadius: BorderRadius.circular(8)),
            child: Text('$position', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: color)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.llTextPrimary)),
                const SizedBox(height: 2),
                Text(item.value, style: LL.caption.copyWith(fontSize: 10.5)),
              ],
            ),
          ),
          LLDelta(value: item.delta, up: item.up),
        ],
      ),
    );
  }
}

class AdminAlertRow extends StatelessWidget {
  const AdminAlertRow({super.key, required this.kind, required this.title, required this.body, required this.action, this.onAction});
  final AdminAlertKind kind;
  final String title;
  final String body;
  final String action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final color = switch (kind) { AdminAlertKind.danger => LL.live, AdminAlertKind.warning => LL.warning, AdminAlertKind.info => LL.info };
    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(color: color.llOpacity(0.08), borderRadius: BorderRadius.circular(11), border: Border.all(color: color.llOpacity(0.22))),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: color.llOpacity(0.14), borderRadius: BorderRadius.circular(9)),
            child: Icon(Icons.warning_amber_rounded, size: 15, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: context.llTextPrimary)),
                const SizedBox(height: 2),
                Text(body, maxLines: 2, overflow: TextOverflow.ellipsis, style: LL.caption.copyWith(fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          LLButton(label: action, icon: Icons.arrow_forward_rounded, variant: LLButtonVariant.ghost, small: true, onTap: onAction),
        ],
      ),
    );
  }
}

enum AdminAlertKind { danger, warning, info }

class AdminChartCard extends StatelessWidget {
  const AdminChartCard({super.key, required this.title, required this.subtitle, required this.child});
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: context.llTextPrimary)),
          const SizedBox(height: 2),
          Text(subtitle, style: LL.caption.copyWith(fontSize: 11)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class AdminLineChart extends StatelessWidget {
  const AdminLineChart({super.key, required this.data, this.secondaryData, required this.labels, this.height = 210, this.maxY = 70, this.formatLast = 'R\$ 66,5k'});
  final List<double> data;
  final List<double>? secondaryData;
  final List<String> labels;
  final double height;
  final double maxY;
  final String formatLast;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _AdminLineChartPainter(
          data: data,
          secondaryData: secondaryData,
          labels: labels,
          maxY: maxY,
          formatLast: formatLast,
          gridColor: context.llBorderMid,
          captionColor: context.llTextMuted,
          tooltipBgColor: context.llTextPrimary,
          tooltipFgColor: context.llBg,
          dotInnerColor: context.llSurface2,
        ),
      ),
    );
  }
}

class _AdminLineChartPainter extends CustomPainter {
  _AdminLineChartPainter({
    required this.data,
    required this.secondaryData,
    required this.labels,
    required this.maxY,
    required this.formatLast,
    required this.gridColor,
    required this.captionColor,
    required this.tooltipBgColor,
    required this.tooltipFgColor,
    required this.dotInnerColor,
  });
  final List<double> data;
  final List<double>? secondaryData;
  final List<String> labels;
  final double maxY;
  final String formatLast;
  final Color gridColor;
  final Color captionColor;
  final Color tooltipBgColor;
  final Color tooltipFgColor;
  final Color dotInnerColor;

  @override
  void paint(Canvas canvas, Size size) {
    const left = 48.0;
    const right = 14.0;
    const top = 12.0;
    const bottom = 28.0;
    final width = math.max(1.0, size.width - left - right);
    final height = math.max(1.0, size.height - top - bottom);

    double x(int i) => left + (i / math.max(1, data.length - 1)) * width;
    double y(double v) => top + height - (v / maxY).clamp(0.0, 1.0) * height;

    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    final ticks = [0.0, maxY * .25, maxY * .5, maxY * .75, maxY];
    for (final tick in ticks) {
      final yy = y(tick);
      _drawDashedLine(canvas, Offset(left, yy), Offset(size.width - right, yy), gridPaint);
      textPainter.text = TextSpan(text: tick == 0 ? 'R\$ 0' : 'R\$ ${tick.toStringAsFixed(1).replaceAll('.', ',')} mil', style: LL.caption.copyWith(fontSize: 9, color: captionColor));
      textPainter.layout(maxWidth: 42);
      textPainter.paint(canvas, Offset(left - 8 - textPainter.width, yy - 6));
    }

    for (var i = 0; i < labels.length; i++) {
      if (i >= data.length) break;
      textPainter.text = TextSpan(text: labels[i], style: LL.caption.copyWith(fontSize: 9, color: captionColor));
      textPainter.layout(maxWidth: 48);
      textPainter.paint(canvas, Offset(x(i) - textPainter.width / 2, size.height - 16));
    }

    final path = Path();
    for (var i = 0; i < data.length; i++) {
      final p = Offset(x(i), y(data[i]));
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }

    final fillPath = Path.from(path)
      ..lineTo(x(data.length - 1), top + height)
      ..lineTo(x(0), top + height)
      ..close();
    canvas.drawPath(
      fillPath,
      Paint()
        ..shader = LinearGradient(colors: [LL.accent.llOpacity(0.28), LL.accent.llOpacity(0)], begin: Alignment.topCenter, end: Alignment.bottomCenter).createShader(Rect.fromLTWH(0, top, size.width, height)),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = LL.accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    if (secondaryData != null && secondaryData!.length == data.length) {
      final secPath = Path();
      for (var i = 0; i < secondaryData!.length; i++) {
        final p = Offset(x(i), y(secondaryData![i]));
        if (i == 0) {
          secPath.moveTo(p.dx, p.dy);
        } else {
          secPath.lineTo(p.dx, p.dy);
        }
      }
      canvas.drawPath(
        secPath,
        Paint()
          ..color = LL.success
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round,
      );
    }

    for (var i = 0; i < data.length; i++) {
      final p = Offset(x(i), y(data[i]));
      canvas.drawCircle(p, i == data.length - 1 ? 4.8 : 2.6, Paint()..color = i == data.length - 1 ? LL.accent : dotInnerColor);
      canvas.drawCircle(p, i == data.length - 1 ? 4.8 : 2.6, Paint()..style = PaintingStyle.stroke..strokeWidth = 1.6..color = LL.accent);
    }

    final last = Offset(x(data.length - 1), y(data.last));
    final labelRect = RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(last.dx - 32, last.dy - 24), width: 72, height: 23), const Radius.circular(6));
    canvas.drawRRect(labelRect, Paint()..color = tooltipBgColor);
    textPainter.text = TextSpan(text: formatLast, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: tooltipFgColor));
    textPainter.layout(maxWidth: 72);
    textPainter.paint(canvas, Offset(labelRect.outerRect.center.dx - textPainter.width / 2, labelRect.outerRect.center.dy - textPainter.height / 2));
  }

  void _drawDashedLine(Canvas canvas, Offset a, Offset b, Paint paint) {
    const dash = 4.0;
    const gap = 4.0;
    final total = (b - a).distance;
    final dir = (b - a) / total;
    var distance = 0.0;
    while (distance < total) {
      final start = a + dir * distance;
      final end = a + dir * math.min(distance + dash, total);
      canvas.drawLine(start, end, paint);
      distance += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _AdminLineChartPainter oldDelegate) => oldDelegate.data != data || oldDelegate.secondaryData != secondaryData || oldDelegate.labels != labels || oldDelegate.maxY != maxY;
}

class AdminGrowthChart extends StatelessWidget {
  const AdminGrowthChart({super.key, this.items = const []});
  final List<GrowthBarItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return SizedBox(
        height: 210,
        child: Center(
          child: Text('Sem dados de crescimento no período',
              style: LL.caption.copyWith(fontSize: 11.5)),
        ),
      );
    }
    final mapped = items
        .map((it) =>
            _GrowthItem(it.name, it.normalizedValue, it.deltaLabel))
        .toList();

    return SizedBox(
      height: 210,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final item in mapped)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(item.label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: item.value > 0 ? LL.success : context.llTextMuted)),
                    const SizedBox(height: 8),
                    Expanded(
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: FractionallySizedBox(
                          heightFactor: math.max(0.035, item.value),
                          child: Container(
                            width: 44,
                            decoration: BoxDecoration(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                              gradient: item.value > 0 ? const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [LL.success, Color(0xFF28A745)]) : null,
                              color: item.value > 0 ? null : context.llTextMuted.llOpacity(0.25),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 9),
                    Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: context.llTextSecond)),
                    Text('vs mês ant.', style: LL.caption.copyWith(fontSize: 8.5)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class GrowthBarItem {
  const GrowthBarItem(
      {required this.name,
      required this.normalizedValue,
      required this.deltaLabel});
  final String name;
  final double normalizedValue; // 0..1
  final String deltaLabel;
}

class _GrowthItem {
  const _GrowthItem(this.name, this.value, this.label);
  final String name;
  final double value;
  final String label;
}

class AdminStatusPill extends StatelessWidget {
  const AdminStatusPill({super.key, required this.label, this.color = LL.live});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.llOpacity(0.12), borderRadius: BorderRadius.circular(99), border: Border.all(color: color.llOpacity(0.24))),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 5),
          Text(label.toUpperCase(), style: TextStyle(fontSize: 9.5, color: color, fontWeight: FontWeight.w900, letterSpacing: 0.45)),
        ],
      ),
    );
  }
}
