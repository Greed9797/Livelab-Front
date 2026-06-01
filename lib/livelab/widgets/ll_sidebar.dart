import 'package:flutter/material.dart';
import '../theme/tokens.dart';
import '../theme/livelab_theme.dart';
import '../theme/theme_controller.dart';

class LlNavItem {
  const LlNavItem({required this.label, required this.icon, required this.path});
  final String label;
  final IconData icon;
  final String path;
}

class LlSidebar extends StatelessWidget {
  const LlSidebar({
    super.key,
    required this.items,
    required this.currentPath,
    required this.onSelect,
  });

  final List<LlNavItem> items;
  final String currentPath;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final theme = LlThemeScope.of(context);

    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: t.bgElev1,
        border: Border(right: BorderSide(color: t.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(LlSpacing.xl),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(LlRadius.sm),
                  child: Image.asset(
                    'assets/images/favicon.png',
                    width: 28,
                    height: 28,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: LlSpacing.md),
                Text(
                  'Livelab',
                  style: TextStyle(
                    color: t.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: LlSpacing.sm),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: LlSpacing.md),
              itemCount: items.length,
              itemBuilder: (c, i) {
                final it = items[i];
                final selected = it.path == currentPath;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Material(
                    color: selected ? t.primarySoft : Colors.transparent,
                    borderRadius: BorderRadius.circular(LlRadius.md),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(LlRadius.md),
                      onTap: () => onSelect(it.path),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: LlSpacing.md,
                          vertical: LlSpacing.md,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              it.icon,
                              size: 18,
                              color: selected ? t.primary : t.textMuted,
                            ),
                            const SizedBox(width: LlSpacing.md),
                            Text(
                              it.label,
                              style: TextStyle(
                                color: selected ? t.textPrimary : t.textSecondary,
                                fontSize: 13,
                                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(LlSpacing.md),
            child: Material(
              color: t.bgElev2,
              borderRadius: BorderRadius.circular(LlRadius.md),
              child: InkWell(
                borderRadius: BorderRadius.circular(LlRadius.md),
                onTap: theme.toggle,
                child: Padding(
                  padding: const EdgeInsets.all(LlSpacing.md),
                  child: Row(
                    children: [
                      Icon(
                        theme.isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                        size: 16,
                        color: t.textSecondary,
                      ),
                      const SizedBox(width: LlSpacing.sm),
                      Text(
                        theme.isDark ? 'Modo escuro' : 'Modo claro',
                        style: TextStyle(
                          color: t.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
