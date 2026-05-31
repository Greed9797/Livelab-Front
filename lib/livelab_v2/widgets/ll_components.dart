import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/ll_theme.dart';

class LLLogo extends StatelessWidget {
  const LLLogo({super.key, this.size = 36});
  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.28),
      child: Image.asset(
        'assets/images/favicon.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
      ),
    );
  }
}

class LLAvatar extends StatelessWidget {
  const LLAvatar({super.key, this.initials = 'LP', this.size = 34, this.radius});
  final String initials;
  final double size;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius ?? size / 2),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LL.accent, Color(0xFFFF8800)],
        ),
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontSize: size * 0.35,
          letterSpacing: -0.5,
        ),
      ),
    );
  }
}

class LLBadge extends StatelessWidget {
  const LLBadge({super.key, required this.label, this.color = LL.live, this.background});
  final String label;
  final Color color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        color: background ?? color.llOpacity(0.14),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          color: color,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class LLScreenHeader extends StatelessWidget {
  const LLScreenHeader({super.key, required this.label, this.italic, this.bold, this.subtitle});
  final String label;
  final String? italic;
  final String? bold;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('— $label'.toUpperCase(), style: LL.label),
        const SizedBox(height: 6),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.end,
          spacing: 7,
          children: [
            if (italic != null) Text(italic!, style: LL.titleItalic.copyWith(color: context.llTextPrimary)),
            if (bold != null) Text(bold!, style: LL.titleBold.copyWith(color: context.llTextPrimary)),
          ],
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: LL.caption.copyWith(fontSize: 12.5, color: context.llTextMuted)),
        ],
      ],
    );
  }
}

class LLButton extends StatelessWidget {
  const LLButton({
    super.key,
    required this.label,
    this.icon,
    this.onTap,
    this.variant = LLButtonVariant.accent,
    this.small = false,
    this.expanded = false,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final LLButtonVariant variant;
  final bool small;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final bool accent = variant == LLButtonVariant.accent;
    final bool whatsapp = variant == LLButtonVariant.whatsapp;
    final Color fg = accent ? Colors.white : whatsapp ? const Color(0xFF25D366) : context.llTextSecond;
    final Color bg = accent ? LL.accent : whatsapp ? const Color(0x1F25D366) : Colors.transparent;
    final Border? border = accent ? null : Border.all(color: whatsapp ? const Color(0x4425D366) : context.llBorderMid);

    final child = AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      height: small ? 34 : 42,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: bg,
        border: border,
        borderRadius: BorderRadius.circular(small ? 8 : 10),
        gradient: accent ? const LinearGradient(colors: [LL.accent, LL.accent2]) : null,
        boxShadow: accent ? [BoxShadow(color: LL.accent.llOpacity(0.32), blurRadius: 14, offset: const Offset(0, 4))] : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: small ? 14 : 16, color: fg),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: small ? 12 : 13, fontWeight: FontWeight.w800, color: fg),
            ),
          ),
        ],
      ),
    );

    return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: expanded ? SizedBox(width: double.infinity, child: child) : child);
  }
}

enum LLButtonVariant { accent, ghost, whatsapp }

class LLCard extends StatelessWidget {
  const LLCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
    this.borderColor,
    this.radius = 14,
    this.leftBorderColor,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;
  final double radius;
  final Color? leftBorderColor;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? context.llSurface2;
    final effectiveBorderColor = borderColor ?? context.llBorder;
    return Container(
      decoration: BoxDecoration(
        color: effectiveColor,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: effectiveBorderColor),
      ),
      clipBehavior: Clip.hardEdge,
      child: Stack(
        children: [
          if (leftBorderColor != null) Positioned(left: 0, top: 0, bottom: 0, child: Container(width: 3, color: leftBorderColor)),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}

class LLDelta extends StatelessWidget {
  const LLDelta({super.key, required this.value, required this.up});
  final String value;
  final bool up;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: up ? LL.successSoft : LL.liveSoft, borderRadius: BorderRadius.circular(5)),
      child: Text(value, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: up ? LL.success : LL.live)),
    );
  }
}

class LLSegmented extends StatelessWidget {
  const LLSegmented({super.key, required this.items, required this.value, required this.onChanged});
  final List<LLSegmentItem> items;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: context.llSurface2, borderRadius: BorderRadius.circular(9), border: Border.all(color: context.llBorder)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: items.map((item) {
          final active = item.id == value;
          return InkWell(
            onTap: () => onChanged(item.id),
            borderRadius: BorderRadius.circular(7),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: active ? LL.accent : Colors.transparent, borderRadius: BorderRadius.circular(7)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item.dot != null) ...[
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: item.dot, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                  ],
                  Text(item.label, style: TextStyle(fontSize: 12, fontWeight: active ? FontWeight.w800 : FontWeight.w600, color: active ? Colors.white : context.llTextMuted)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class LLSegmentItem {
  const LLSegmentItem(this.id, this.label, {this.dot});
  final String id;
  final String label;
  final Color? dot;
}

class LLSparkline extends StatelessWidget {
  const LLSparkline({super.key, required this.data, this.color = LL.accent, this.width = 110, this.height = 32, this.fill = true});
  final List<double> data;
  final Color color;
  final double width;
  final double height;
  final bool fill;

  @override
  Widget build(BuildContext context) {
    if (data.length < 2) return const SizedBox.shrink();
    return CustomPaint(size: Size(width, height), painter: _SparklinePainter(data, color, fill));
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter(this.data, this.color, this.fill);
  final List<double> data;
  final Color color;
  final bool fill;

  @override
  void paint(Canvas canvas, Size size) {
    final minV = data.reduce(math.min);
    final maxV = data.reduce(math.max);
    final range = (maxV - minV).abs() < 0.001 ? 1 : maxV - minV;
    final points = <Offset>[];
    for (var i = 0; i < data.length; i++) {
      final x = (i / (data.length - 1)) * size.width;
      final y = size.height - ((data[i] - minV) / range) * (size.height - 4) - 2;
      points.add(Offset(x, y));
    }
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }

    if (fill) {
      final fillPath = Path.from(path)
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close();
      canvas.drawPath(
        fillPath,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [color.llOpacity(0.32), color.llOpacity(0)],
          ).createShader(Offset.zero & size),
      );
    }

    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) => oldDelegate.data != data || oldDelegate.color != color || oldDelegate.fill != fill;
}

class LLCircularProgress extends StatelessWidget {
  const LLCircularProgress({super.key, required this.value, this.size = 88, this.stroke = 7, this.color = LL.accent, this.center});
  final double value;
  final double size;
  final double stroke;
  final Color color;
  final Widget? center;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(size: Size(size, size), painter: _CirclePainter(value: value, stroke: stroke, color: color, trackColor: context.llSurface3)),
          if (center != null) center!,
        ],
      ),
    );
  }
}

class _CirclePainter extends CustomPainter {
  _CirclePainter({required this.value, required this.stroke, required this.color, required this.trackColor});
  final double value;
  final double stroke;
  final Color color;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - stroke) / 2;
    canvas.drawCircle(center, radius, Paint()..color = trackColor..style = PaintingStyle.stroke..strokeWidth = stroke);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      math.pi * 2 * value.clamp(0.0, 1.0).toDouble(),
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _CirclePainter oldDelegate) => oldDelegate.value != value || oldDelegate.color != color || oldDelegate.trackColor != trackColor;
}

class LLProgressBar extends StatelessWidget {
  const LLProgressBar({super.key, required this.value, this.color = LL.accent, this.height = 5});
  final double value;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(height / 2),
      child: Container(
        height: height,
        color: context.llSurface3,
        alignment: Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: value.clamp(0.0, 1.0).toDouble(),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [color, color.llOpacity(0.72)]),
            ),
          ),
        ),
      ),
    );
  }
}

class LLBarChart extends StatelessWidget {
  const LLBarChart({super.key, required this.items});
  final List<LLBarItem> items;

  @override
  Widget build(BuildContext context) {
    final max = items.fold<double>(1, (p, e) => math.max(p, e.value));
    return SizedBox(
      height: 150,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: items.map((item) {
          final isCurrent = item.highlight;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 5),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(item.topLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: isCurrent ? LL.accent : context.llTextMuted)),
                  const SizedBox(height: 6),
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: (item.value / max).clamp(0.08, 1.0).toDouble(),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              flex: 2,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: isCurrent ? const [LL.accent, Color(0xFFFF7700)] : [LL.accent.llOpacity(0.42), LL.accent.llOpacity(0.14)],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 3),
                            Expanded(
                              child: FractionallySizedBox(
                                heightFactor: (item.secondary / 30).clamp(0.08, 1.0).toDouble(),
                                alignment: Alignment.bottomCenter,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: isCurrent ? LL.info : LL.info.llOpacity(0.34),
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(item.label, style: TextStyle(fontSize: 11, fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600, color: isCurrent ? context.llTextPrimary : context.llTextMuted)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class LLBarItem {
  const LLBarItem({required this.label, required this.value, required this.secondary, required this.topLabel, this.highlight = false});
  final String label;
  final double value;
  final double secondary;
  final String topLabel;
  final bool highlight;
}

String llMoney(num value) {
  final integer = value.round().toString();
  final buffer = StringBuffer();
  var count = 0;
  for (var i = integer.length - 1; i >= 0; i--) {
    buffer.write(integer[i]);
    count++;
    if (count == 3 && i != 0) {
      buffer.write('.');
      count = 0;
    }
  }
  return 'R\$ ${buffer.toString().split('').reversed.join()}';
}

String llPad2(int value) => value.toString().padLeft(2, '0');
