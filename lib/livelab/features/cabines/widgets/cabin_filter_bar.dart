import 'package:flutter/material.dart';
import '../../../theme/tokens.dart';
import '../../../theme/livelab_theme.dart';
import '../cabines_models.dart';

class CabinFilterBar extends StatelessWidget {
  const CabinFilterBar({
    super.key,
    required this.filters,
    required this.onChanged,
    required this.counts,
  });

  final CabinFilters filters;
  final ValueChanged<CabinFilters> onChanged;
  final Map<CabinStatus?, int> counts; // key=null is "all"

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return LayoutBuilder(builder: (c, box) {
      final stack = box.maxWidth < 720;
      final search = _search(t);
      final chips = _chips(t);
      if (stack) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            search,
            const SizedBox(height: LlSpacing.md),
            SingleChildScrollView(scrollDirection: Axis.horizontal, child: chips),
          ],
        );
      }
      return Row(
        children: [
          Expanded(child: search),
          const SizedBox(width: LlSpacing.lg),
          chips,
        ],
      );
    });
  }

  Widget _search(LlTokens t) {
    return Container(
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(LlRadius.md),
        border: Border.all(color: t.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: LlSpacing.md),
      child: Row(
        children: [
          Icon(Icons.search, size: 16, color: t.textMuted),
          const SizedBox(width: LlSpacing.sm),
          Expanded(
            child: TextField(
              onChanged: (v) => onChanged(filters.copyWith(search: v)),
              style: TextStyle(color: t.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: 'Buscar por cabine, cliente ou apresentadora…',
                hintStyle: TextStyle(color: t.textMuted, fontSize: 13),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chips(LlTokens t) {
    final entries = <(CabinStatus?, String)>[
      (null, 'Todas'),
      (CabinStatus.live, 'Ao vivo'),
      (CabinStatus.busy, 'Preparando'),
      (CabinStatus.free, 'Livres'),
      (CabinStatus.maint, 'Manutenção'),
    ];
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final (status, label) in entries) ...[
          _chip(t, status: status, label: label, count: counts[status] ?? 0),
          const SizedBox(width: 6),
        ],
      ],
    );
  }

  Widget _chip(LlTokens t, {required CabinStatus? status, required String label, required int count}) {
    final active = filters.status == status;
    return Material(
      color: active ? t.primarySoft : t.bgElev1,
      borderRadius: BorderRadius.circular(LlRadius.pill),
      child: InkWell(
        borderRadius: BorderRadius.circular(LlRadius.pill),
        onTap: () => onChanged(filters.copyWith(status: status, clearStatus: status == null)),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(LlRadius.pill),
            border: Border.all(color: active ? t.primary : t.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (status == CabinStatus.live) ...[
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(color: t.primary, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  color: active ? t.primary : t.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: active ? t.primary : t.bgElev2,
                  borderRadius: BorderRadius.circular(LlRadius.sm),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    color: active ? Colors.white : t.textMuted,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
