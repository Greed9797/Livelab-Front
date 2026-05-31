// lib/widgets/period_picker.dart
// Dropdown dos últimos 12 meses, label "Mai/26", value "YYYY-MM".

import 'package:flutter/material.dart';

import '../design_system/design_system.dart';

class PeriodPicker extends StatelessWidget {
  final String value; // "YYYY-MM"
  final ValueChanged<String> onChanged;
  final int monthsBack;

  const PeriodPicker({
    super.key,
    required this.value,
    required this.onChanged,
    this.monthsBack = 12,
  });

  static const _meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  static String currentPeriod() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  List<MapEntry<String, String>> _options() {
    final now = DateTime.now();
    final list = <MapEntry<String, String>>[];
    for (int i = 0; i < monthsBack; i++) {
      final d = DateTime(now.year, now.month - i, 1);
      final ym = '${d.year}-${d.month.toString().padLeft(2, '0')}';
      final label = '${_meses[d.month - 1]}/${d.year.toString().substring(2)}';
      list.add(MapEntry(ym, label));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final options = _options();
    final values = options.map((e) => e.key).toSet();
    final safeValue = values.contains(value) ? value : options.first.key;

    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x3),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        border: Border.all(color: AppColors.borderLight),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: safeValue,
          isDense: true,
          icon: const Icon(Icons.keyboard_arrow_down, size: 18),
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary),
          items: [
            for (final o in options)
              DropdownMenuItem(value: o.key, child: Text(o.value)),
          ],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}
