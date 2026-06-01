import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/analytics_dashboard.dart';
import '../../design_system/design_system.dart';

class GmvMensalChart extends StatelessWidget {
  final List<FaturamentoMensal> dados;

  const GmvMensalChart({super.key, required this.dados});

  @override
  Widget build(BuildContext context) {
    if (dados.isEmpty) return _buildEmptyState(context);

    final maxY = _maxY();

    return SizedBox(
      height: 300,
      child: AppCard(
        padding: const EdgeInsets.fromLTRB(16, 24, 24, 16),
        child: RepaintBoundary(
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 8, bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Faturamento Mensal (GMV)', style: AppTypography.h3.copyWith(fontSize: 15, color: context.colors.textPrimary)),
                  const SizedBox(height: 2),
                  Text('Últimos 12 meses', style: AppTypography.caption.copyWith(color: context.colors.textSecondary)),
                ],
              ),
            ),
            Expanded(
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxY,
                  minY: 0,
                  barTouchData: _buildTouchData(context),
                  titlesData: _buildTitles(context),
                  borderData: FlBorderData(show: false),
                  gridData: _buildGridData(maxY, context),
                  barGroups: _buildBarGroups(context),
                ),
                swapAnimationDuration: const Duration(milliseconds: 600),
                swapAnimationCurve: Curves.easeOutQuint,
              ),
            ),
          ],
          ),
        ),
      ),
    );
  }

  double _maxY() {
    final maxGmv = dados.map((d) => d.gmv).fold(0.0, (a, b) => a > b ? a : b);
    return maxGmv > 0 ? maxGmv * 1.15 : 1000;
  }

  BarTouchData _buildTouchData(BuildContext context) {
    return BarTouchData(
      enabled: true,
      touchTooltipData: BarTouchTooltipData(
        getTooltipColor: (_) => const Color(0xFF1A1A1A),
        tooltipPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        tooltipRoundedRadius: 8,
        getTooltipItem: (group, _, rod, __) {
          final dado = dados[group.x];
          return BarTooltipItem(
            NumberFormat.simpleCurrency(locale: 'pt_BR').format(dado.gmv),
            const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            children: [
              TextSpan(
                text: '\n${dado.mes}',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11),
              ),
            ],
          );
        },
      ),
    );
  }

  FlTitlesData _buildTitles(BuildContext context) {
    final shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return FlTitlesData(
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 28,
          getTitlesWidget: (value, _) {
            final idx = value.toInt();
            if (idx < 0 || idx >= dados.length) return const SizedBox.shrink();
            final month = int.tryParse(dados[idx].mes.split('-').last) ?? 1;
            return Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                shortMonths[month - 1],
                style: AppTypography.caption.copyWith(color: context.colors.textSecondary, fontSize: 10),
              ),
            );
          },
        ),
      ),
      leftTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 72,
          getTitlesWidget: (value, _) {
            if (value == 0) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Text(
                NumberFormat.compactCurrency(locale: 'pt_BR', symbol: 'R\$').format(value),
                style: AppTypography.caption.copyWith(
                  color: context.colors.textSecondary.withValues(alpha: 0.6),
                  fontSize: 10,
                ),
                textAlign: TextAlign.right,
                maxLines: 1,
              ),
            );
          },
        ),
      ),
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
    );
  }

  FlGridData _buildGridData(double maxY, BuildContext context) {
    return FlGridData(
      show: true,
      drawVerticalLine: false,
      horizontalInterval: maxY / 4 > 0 ? maxY / 4 : 250,
      getDrawingHorizontalLine: (_) => FlLine(
        color: context.colors.borderSubtle,
        strokeWidth: 1,
        dashArray: [4, 4],
      ),
    );
  }

  List<BarChartGroupData> _buildBarGroups(BuildContext context) {
    return dados.asMap().entries.map((entry) {
      return BarChartGroupData(
        x: entry.key,
        barRods: [
          BarChartRodData(
            toY: entry.value.gmv,
            width: dados.length > 12 ? 14 : 18,
            gradient: LinearGradient(
              colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.4)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            backDrawRodData: BackgroundBarChartRodData(
              show: true,
              toY: _maxY(),
              color: context.colors.borderSubtle.withValues(alpha: 0.08),
            ),
          ),
        ],
      );
    }).toList();
  }

  Widget _buildEmptyState(BuildContext context) {
    return SizedBox(
      height: 300,
      width: double.infinity,
      child: AppCard(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart_rounded, size: 48, color: context.colors.textSecondary.withValues(alpha: 0.3)),
            const SizedBox(height: AppSpacing.x3),
            Text('Sem dados de faturamento', style: AppTypography.bodySmall.copyWith(color: context.colors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
