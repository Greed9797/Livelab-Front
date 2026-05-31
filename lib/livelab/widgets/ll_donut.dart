import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../theme/livelab_theme.dart';

class LlDonutSegment {
  const LlDonutSegment({required this.value, required this.color, this.label});
  final double value;
  final Color color;
  final String? label;
}

class LlDonut extends StatelessWidget {
  const LlDonut({
    super.key,
    required this.segments,
    this.size = 140,
    this.strokeWidth = 14,
    this.centerLabel,
    this.centerSubtitle,
  });

  final List<LlDonutSegment> segments;
  final double size;
  final double strokeWidth;
  final String? centerLabel;
  final String? centerSubtitle;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _DonutPainter(segments: segments, stroke: strokeWidth, track: t.hairline),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (centerLabel != null)
                Text(
                  centerLabel!,
                  style: TextStyle(
                    color: t.textPrimary,
                    fontSize: size / 5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.6,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              if (centerSubtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  centerSubtitle!,
                  style: TextStyle(
                    color: t.textMuted,
                    fontSize: 10,
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({required this.segments, required this.stroke, required this.track});
  final List<LlDonutSegment> segments;
  final double stroke;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = (size.shortestSide - stroke) / 2;
    final rect = Rect.fromCircle(center: c, radius: r);

    canvas.drawCircle(
      c,
      r,
      Paint()
        ..color = track
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke,
    );

    final total = segments.fold<double>(0, (a, b) => a + b.value);
    if (total <= 0) return;
    var start = -math.pi / 2;
    for (final s in segments) {
      final sweep = (s.value / total) * math.pi * 2;
      canvas.drawArc(
        rect,
        start,
        sweep,
        false,
        Paint()
          ..color = s.color
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.butt,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) => true;
}
