import 'package:flutter/material.dart';
import '../../../theme/livelab_theme.dart';
import '../home_models.dart';

class CtaStrip extends StatelessWidget {
  const CtaStrip({super.key, required this.items});
  final List<CtaItem> items;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (c, box) {
      final cols = box.maxWidth < 720 ? 2 : 4;
      return GridView.builder(
        primary: false,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          mainAxisExtent: 88,
        ),
        itemCount: items.length,
        itemBuilder: (_, i) => _CtaCard(item: items[i]),
      );
    });
  }
}

class _CtaCard extends StatelessWidget {
  const _CtaCard({required this.item});
  final CtaItem item;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final isPrimary = item.primary;
    final iconBg = isPrimary ? Colors.white.withValues(alpha: 0.20) : t.primarySoft;
    final iconFg = isPrimary ? Colors.white : t.primary;
    final titleColor = isPrimary ? Colors.white : t.textPrimary;
    final subColor = isPrimary ? Colors.white.withValues(alpha: 0.85) : t.textMuted;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: item.onTap,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isPrimary ? null : t.bgElev1,
            gradient: isPrimary
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [t.primary, const Color(0xFFFF8A3C)],
                  )
                : null,
            borderRadius: BorderRadius.circular(16),
            border: isPrimary ? null : Border.all(color: t.border),
            boxShadow: isPrimary
                ? [BoxShadow(color: t.primary.withValues(alpha: 0.5), blurRadius: 24, offset: const Offset(0, 8))]
                : t.shadowCard,
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, size: 20, color: iconFg),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600, height: 1.2),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: subColor, fontSize: 11, height: 1.3),
                    ),
                  ],
                ),
              ),
              if (isPrimary)
                const Icon(Icons.arrow_forward, size: 16, color: Colors.white)
              else if (item.count != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(
                    item.count.toString(),
                    style: TextStyle(
                      color: t.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      height: 1,
                      fontFeatures: const [FontFeature.tabularFigures()],
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
