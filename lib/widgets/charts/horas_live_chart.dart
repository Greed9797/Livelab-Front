import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../models/analytics_dashboard.dart';
import '../../design_system/design_system.dart';

class HorasLiveChart extends StatelessWidget {
  final List<HorasLiveDia> dados;

  const HorasLiveChart({super.key, required this.dados});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.fromLTRB(16, 24, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Horas de Live por Dia', style: AppTypography.h3.copyWith(fontSize: 15, color: context.colors.textPrimary)),
                const SizedBox(height: 2),
                Text('Últimos 30 dias do período', style: AppTypography.caption.copyWith(color: context.colors.textSecondary)),
              ],
            ),
          ),
          if (dados.isEmpty)
            _buildEmptyState(context)
          else
            // Scroll horizontal obrigatório para evitar ilegibilidade no mobile (30 pontos)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: RepaintBoundary(
                child: SizedBox(
                  // Mínimo 800px para garantir legibilidade no mobile; expande para o container disponível
                  width: 800,
                  height: 220,
                  child: LineChart(
                    _buildChartData(context),
                    duration: const Duration(milliseconds: 400),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  double _maxY() {
    final maxH = dados.map((d) => d.horas).fold(0.0, (a, b) => a > b ? a : b);
    return maxH > 0 ? maxH * 1.2 : 5;
  }

  LineChartData _buildChartData(BuildContext context) {
    final maxY = _maxY();
    final spots = dados.asMap().entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.horas))
        .toList();

    return LineChartData(
      minX: 0,
      maxX: (dados.length - 1).toDouble(),
      minY: 0,
      maxY: maxY,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          curveSmoothness: 0.3,
          color: AppColors.primary,
          barWidth: 3,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
              radius: 3,
              color: AppColors.primary,
              strokeWidth: 1.5,
              strokeColor: context.colors.bgCard,
            ),
          ),
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withValues(alpha: 0.3),
                AppColors.primary.withValues(alpha: 0.0),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
      ],
      titlesData: _buildTitles(context),
      borderData: FlBorderData(show: false),
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: maxY / 4 > 0 ? maxY / 4 : 1,
        getDrawingHorizontalLine: (_) => FlLine(
          color: context.colors.borderSubtle,
          strokeWidth: 1,
          dashArray: [4, 4],
        ),
      ),
      lineTouchData: LineTouchData(
        enabled: true,
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (_) => const Color(0xFF1A1A1A),
          tooltipRoundedRadius: 8,
          getTooltipItems: (touchedSpots) => touchedSpots.map((spot) {
            final idx = spot.x.toInt();
            if (idx < 0 || idx >= dados.length) return null;
            final d = dados[idx];
            return LineTooltipItem(
              '${d.horas.toStringAsFixed(1)}h\n',
              const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              children: [
                TextSpan(
                  text: d.dia,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  FlTitlesData _buildTitles(BuildContext context) {
    return FlTitlesData(
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 28,
          interval: 4, // mostrar a cada 4 pontos (~cada 4 dias)
          getTitlesWidget: (value, _) {
            final idx = value.toInt();
            if (idx < 0 || idx >= dados.length) return const SizedBox.shrink();
            final dia = dados[idx].dia; // "YYYY-MM-DD"
            final dayNum = dia.length >= 10 ? dia.substring(8, 10) : '';
            return Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                dayNum,
                style: AppTypography.caption.copyWith(color: context.colors.textSecondary, fontSize: 10),
              ),
            );
          },
        ),
      ),
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 44,
          getTitlesWidget: (value, _) {
            if (value == 0) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Text(
                '${value.toStringAsFixed(1)}h',
                style: AppTypography.caption.copyWith(
                  color: context.colors.textSecondary.withValues(alpha: 0.6),
                  fontSize: 10,
                ),
                textAlign: TextAlign.right,
              ),
            );
          },
        ),
      ),
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return SizedBox(
      height: 220,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.show_chart_rounded, size: 48, color: context.colors.textSecondary.withValues(alpha: 0.3)),
          const SizedBox(height: 12),
          Text('Sem dados de horas de live', style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
        ],
      ),
    );
  }
}
