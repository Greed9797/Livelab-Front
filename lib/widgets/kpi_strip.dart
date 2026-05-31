import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

class KpiStripItem {
  final String label;
  final String value;
  final String? sub;
  final Color? valueColor;
  final bool isLive;
  final bool accentTop;
  final String? prefix;

  const KpiStripItem({
    required this.label,
    required this.value,
    this.sub,
    this.valueColor,
    this.isLive = false,
    this.accentTop = false,
    this.prefix,
  });
}

class KpiStrip extends StatelessWidget {
  final List<KpiStripItem> items;
  final int accentIndex;

  const KpiStrip({super.key, required this.items, this.accentIndex = 0});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (ctx, constraints) {
        final isDesktop = constraints.maxWidth >= 800;
        final crossAxisCount = isDesktop ? 4 : 2;
        final rows = (items.length / crossAxisCount).ceil();

        return Column(
          children: List.generate(rows, (rowIdx) {
            final start = rowIdx * crossAxisCount;
            final rowItems = items.sublist(
              start,
              (start + crossAxisCount).clamp(0, items.length),
            );
            final bool isFullRow = rowIdx < rows - 1 || rowItems.length == crossAxisCount;

            return Padding(
              padding: EdgeInsets.only(bottom: isFullRow ? AppSpacing.x3 : 0),
              child: Row(
                children: rowItems.asMap().entries.map((entry) {
                  final idx = start + entry.key;
                  final item = entry.value;
                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(left: idx > start ? AppSpacing.x3 : 0),
                      child: _buildItem(item, idx == accentIndex),
                    ),
                  );
                }).toList(),
              ),
            );
          }),
        );
      },
    );
  }

  Widget _buildItem(KpiStripItem item, bool accent) {
    return KpiAccentCard(
      label: item.label,
      value: item.value,
      sub: item.sub,
      valueColor: item.valueColor,
      prefix: item.prefix,
      accentTop: accent,
      isLive: item.isLive,
    );
  }
}