import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

class PrimeTimeChart extends StatelessWidget {
  final List<PrimeTimeBar> bars;
  final double height;

  const PrimeTimeChart({super.key, required this.bars, this.height = 200});

  @override
  Widget build(BuildContext context) {
    if (bars.isEmpty) return SizedBox(height: height);
    final maxVal = bars.map((b) => b.value).reduce((a, b) => a > b ? a : b);
    if (maxVal == 0) return SizedBox(height: height);

    return SizedBox(
      height: height,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: bars.map((bar) {
          final isActive = bar.isActive;
          final normalized = bar.value / maxVal;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: normalized,
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            gradient: isActive
                                ? const LinearGradient(
                                    colors: [AppColors.primary, AppColors.primaryLight],
                                    begin: Alignment.bottomCenter,
                                    end: Alignment.topCenter,
                                  )
                                : null,
                            color: isActive ? null : context.colors.bgMuted,
                            boxShadow: isActive
                                ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 4, offset: const Offset(0, -2))]
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(bar.label, style: AppTypography.caption.copyWith(fontSize: 9, color: context.colors.textMuted)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class PrimeTimeBar {
  final String label;
  final double value;
  final bool isActive;

  const PrimeTimeBar({required this.label, required this.value, this.isActive = false});
}