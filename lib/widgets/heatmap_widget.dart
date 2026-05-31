import 'package:flutter/material.dart';
import '../design_system/design_system.dart';

class HeatmapWidget extends StatelessWidget {
  final List<List<double>> matrix;
  final List<String> rowLabels;
  final List<String> colLabels;
  final double cellSize;
  final double height;

  const HeatmapWidget({
    super.key,
    required this.matrix,
    this.rowLabels = const [],
    this.colLabels = const [],
    this.cellSize = 24,
    this.height = 200,
  });

  Color _cellColor(double value, BuildContext context) {
    final t = value.clamp(0.0, 1.0);
    // Usamos bgCard (branco) como piso para garantir visibilidade mesmo quando
    // o HeatmapWidget é colocado dentro de um ChartCard com bg primarySofter.
    return Color.lerp(context.colors.bgCard, AppColors.primary, t)!;
  }

  @override
  Widget build(BuildContext context) {
    if (matrix.isEmpty) return SizedBox(height: height);

    final rows = matrix.length;
    final cols = matrix.isNotEmpty ? matrix[0].length : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (colLabels.isNotEmpty)
          Padding(
            padding: EdgeInsets.only(left: cellSize + 4, bottom: 4),
            child: Row(
              children: List.generate(cols, (i) => Expanded(
                child: Text(colLabels[i], style: AppTypography.caption.copyWith(fontSize: 9, color: context.colors.textMuted), textAlign: TextAlign.center),
              )),
            ),
          ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (rowLabels.isNotEmpty)
              Column(
                children: List.generate(rows, (i) => SizedBox(
                  height: cellSize,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: Text(rowLabels[i], style: AppTypography.caption.copyWith(fontSize: 9, color: context.colors.textMuted)),
                    ),
                  ),
                )),
              ),
            Expanded(
              child: SizedBox(
                height: height,
                child: Row(
                  children: List.generate(cols, (col) {
                    return Expanded(
                      child: Column(
                        children: List.generate(rows, (row) {
                          final value = row < matrix.length && col < matrix[row].length ? matrix[row][col] : 0.0;
                          return Container(
                            width: cellSize, height: cellSize,
                            margin: const EdgeInsets.all(1),
                            decoration: BoxDecoration(
                              color: _cellColor(value, context),
                              border: Border.all(
                                color: context.colors.borderSubtle,
                                width: 0.5,
                              ),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      ),
                    );
                  }),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}