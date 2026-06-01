import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class AuditoriaTabs extends StatelessWidget {
  final String current;
  final ValueChanged<String> onChanged;

  const AuditoriaTabs({
    super.key,
    required this.current,
    required this.onChanged,
  });

  static const tabs = [
    ('novos', 'Novos'),
    ('em_tratativa', 'Em Tratativa'),
    ('finalizados', 'Finalizados'),
  ];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: tabs.map((item) {
        final isActive = current == item.$1;
        return ChoiceChip(
          label: Text(item.$2),
          selected: isActive,
          onSelected: (_) => onChanged(item.$1),
          selectedColor: AppColors.primary,
          backgroundColor: context.colors.bgCard,
          side: BorderSide(
            color: isActive ? AppColors.primary : context.colors.borderSubtle,
          ),
          labelStyle: AppTypography.bodySmall.copyWith(
            color: isActive ? context.colors.bgCard : context.colors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        );
      }).toList(),
    );
  }
}
