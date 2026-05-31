import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_colors.dart';
import 'app_colors_theme.dart';
import 'app_typography.dart';
import 'app_tokens.dart';

enum AppCardVariant { flat, default_ }

// ═══════════════════════════════════════════════════════════
// 🃏 APP CARD — card branco padrão do dashboard
// ═══════════════════════════════════════════════════════════
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;
  final double? radius;
  final List<BoxShadow>? shadow;
  final Color? borderColor;
  final Border? border;
  final VoidCallback? onTap;
  final AppCardVariant variant;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.radius,
    this.shadow,
    this.borderColor,
    this.border,
    this.onTap,
    this.variant = AppCardVariant.default_,
  });

  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(radius ?? AppRadius.xl);

    final effectiveShadow =
        variant == AppCardVariant.flat ? null : (shadow ?? AppShadows.md);

    final card = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.x6),
      decoration: BoxDecoration(
        color: color ?? context.colors.bgCard,
        borderRadius: br,
        boxShadow: effectiveShadow,
        border:
            border ?? Border.all(color: borderColor ?? context.colors.borderSubtle),
      ),
      child: child,
    );

    if (onTap == null) return card;

    return Material(
      color: Colors.transparent,
      borderRadius: br,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: br,
        hoverColor: AppColors.primary.withValues(alpha: 0.04),
        splashColor: AppColors.primary.withValues(alpha: 0.08),
        child: card,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🟠 APP PRIMARY BUTTON — CTA laranja pill
// ═══════════════════════════════════════════════════════════
class AppPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool fullWidth;
  final Color? color;
  final bool outlined;

  const AppPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = false,
    this.color,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = color ?? AppColors.primary;
    final fgColor = outlined ? bgColor : AppColors.textOnPrimary;

    final child = isLoading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(fgColor),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18),
                const SizedBox(width: AppSpacing.x2),
              ],
              Text(label),
            ],
          );

    final button = SizedBox(
      height: 40,
      child: outlined
          ? OutlinedButton(
              onPressed: isLoading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: bgColor,
                side: BorderSide(color: bgColor, width: 1.5),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.full)),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: child,
            )
          : ElevatedButton(
              onPressed: isLoading ? null : onPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: bgColor,
                foregroundColor: fgColor,
                shadowColor: bgColor.withValues(alpha: 0.45),
                elevation: 0,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.full)),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: child,
            ),
    );

    return fullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}

// ═══════════════════════════════════════════════════════════
// ⚪ APP SECONDARY BUTTON — outlined branco
// ═══════════════════════════════════════════════════════════
class AppSecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;

  const AppSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: context.colors.textPrimary),
          const SizedBox(width: AppSpacing.x2),
        ],
        Text(label),
      ],
    );

    final button = OutlinedButton(onPressed: onPressed, child: child);
    return fullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}

// ═══════════════════════════════════════════════════════════
// 📝 APP TEXT FIELD — input creme padrão
// ═══════════════════════════════════════════════════════════
class AppTextField extends StatefulWidget {
  final String? hint;
  final IconData? prefixIcon;
  final bool obscureText;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onSubmitted;
  final Widget? suffixIcon;
  final List<TextInputFormatter>? inputFormatters;

  const AppTextField({
    super.key,
    this.hint,
    this.prefixIcon,
    this.obscureText = false,
    this.controller,
    this.keyboardType,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.suffixIcon,
    this.inputFormatters,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late bool _obscure;

  @override
  void initState() {
    super.initState();
    _obscure = widget.obscureText;
  }

  @override
  void didUpdateWidget(covariant AppTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.obscureText != widget.obscureText) {
      setState(() => _obscure = widget.obscureText);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      keyboardType: widget.keyboardType,
      obscureText: _obscure,
      validator: widget.validator,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onSubmitted,
      inputFormatters: widget.inputFormatters,
      style: AppTypography.bodyMedium,
      decoration: InputDecoration(
        hintText: widget.hint,
        prefixIcon: widget.prefixIcon != null
            ? Icon(widget.prefixIcon, color: context.colors.textMuted, size: 20)
            : null,
        suffixIcon: widget.suffixIcon ??
            (widget.obscureText
                ? IconButton(
                    icon: Icon(
                      _obscure ? Icons.visibility_off : Icons.visibility,
                      color: context.colors.textMuted,
                      size: 20,
                    ),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  )
                : null),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🏷️ APP BADGE — badge semântico (sucesso, alerta, etc)
// ═══════════════════════════════════════════════════════════
enum AppBadgeType { success, warning, danger, neutral, info, live }

class AppBadge extends StatelessWidget {
  final String label;
  final AppBadgeType type;
  final bool showDot;

  const AppBadge({
    super.key,
    required this.label,
    this.type = AppBadgeType.success,
    this.showDot = true,
  });

  factory AppBadge.status(String status) {
    final cfg = _statusConfigs[status] ?? _statusConfigs['default']!;
    return AppBadge(
      label: cfg.$1,
      type: cfg.$2,
      showDot: true,
    );
  }

  static const _statusConfigs = <String, (String, AppBadgeType)>{
    'ativo':        ('ATIVO',        AppBadgeType.success),
    'inativo':      ('INATIVO',      AppBadgeType.neutral),
    'ativa':        ('ATIVA',        AppBadgeType.success),
    'ao_vivo':      ('AO VIVO',      AppBadgeType.live),
    'reservada':    ('RESERVADA',    AppBadgeType.warning),
    'enviado':      ('ENVIADO',      AppBadgeType.warning),
    'em_analise':   ('EM ANÁLISE',   AppBadgeType.warning),
    'negociacao':   ('NEGOCIAÇÃO',   AppBadgeType.warning),
    'inadimplente': ('INADIMPLENTE', AppBadgeType.danger),
    'recomendacao': ('RECOMENDAÇÃO', AppBadgeType.neutral),
    'disponivel':   ('DISPONÍVEL',   AppBadgeType.neutral),
    'manutencao':   ('MANUTENÇÃO',   AppBadgeType.danger),
    'pendente':     ('PENDENTE',     AppBadgeType.warning),
    'aprovada':     ('APROVADA',     AppBadgeType.success),
    'recusada':     ('RECUSADA',     AppBadgeType.danger),
    'encerrada':    ('ENCERRADA',    AppBadgeType.neutral),
    'pago':         ('PAGO',         AppBadgeType.success),
    'vencido':      ('VENCIDO',      AppBadgeType.danger),
    'suspenso':     ('SUSPENSO',     AppBadgeType.danger),
    'default':      ('N/A',          AppBadgeType.neutral),
  };

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (type) {
      AppBadgeType.success => (AppColors.successBg, AppColors.success),
      AppBadgeType.warning => (AppColors.warningBg, AppColors.warning),
      AppBadgeType.danger => (AppColors.dangerBg, AppColors.danger),
      AppBadgeType.neutral => (context.colors.bgMuted, context.colors.textSecondary),
      AppBadgeType.info => (AppColors.infoBg, AppColors.info),
      AppBadgeType.live => (AppColors.successBg, AppColors.success),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x1 + 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.fullR,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            type == AppBadgeType.live
                ? const _PulsingDot(color: AppColors.success)
                : Container(
                    width: 6,
                    height: 6,
                    decoration:
                        BoxDecoration(color: fg, shape: BoxShape.circle)),
            const SizedBox(width: AppSpacing.x2),
          ],
          Text(label, style: AppTypography.badge.copyWith(color: fg)),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 APP KPI CARD — card de métrica do dashboard
// ═══════════════════════════════════════════════════════════
class AppKpiCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? subLabel;
  final Color? subLabelColor;

  const AppKpiCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.subLabel,
    this.subLabelColor,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: context.colors.primarySoftBg,
                  borderRadius: AppRadius.smR,
                ),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.x3),
              Text(label, style: AppTypography.label),
            ],
          ),
          const SizedBox(height: AppSpacing.x4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(value, style: AppTypography.h2),
              if (subLabel != null) ...[
                const SizedBox(width: AppSpacing.x2),
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    subLabel!,
                    style: AppTypography.caption.copyWith(
                      color: subLabelColor ?? AppColors.success,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 APP PROGRESS BAR — barra de progresso laranja
// ═══════════════════════════════════════════════════════════
class AppProgressBar extends StatelessWidget {
  final double value; // 0.0 a 1.0
  final double height;

  const AppProgressBar({
    super.key,
    required this.value,
    this.height = 6,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadius.fullR,
      child: LinearProgressIndicator(
        value: value.clamp(0.0, 1.0),
        minHeight: height,
        backgroundColor: context.colors.bgMuted,
        valueColor: const AlwaysStoppedAnimation(AppColors.primary),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// ⭐ APP RATING STARS — estrelas de avaliação
// ═══════════════════════════════════════════════════════════
class AppRatingStars extends StatelessWidget {
  final int rating; // 0-5
  final double size;

  const AppRatingStars({
    super.key,
    required this.rating,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final filled = i < rating;
        return Padding(
          padding: const EdgeInsets.only(right: 2),
          child: Icon(
            filled ? Icons.star : Icons.star_border,
            size: size,
            color: AppColors.warning,
          ),
        );
      }),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🌈 APP GRADIENT BACKGROUND — fundo peach do app
// ═══════════════════════════════════════════════════════════
class AppGradientBackground extends StatelessWidget {
  final Widget child;

  const AppGradientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    if (Theme.of(context).brightness == Brightness.dark) {
      return child;
    }
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.peachGradient),
      child: child,
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📑 APP SECTION HEADER — título de seção com subtitle opcional
// ═══════════════════════════════════════════════════════════
class AppSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;

  const AppSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.h3),
                if (subtitle != null) ...[
                  const SizedBox(height: AppSpacing.x1),
                  Text(
                    subtitle!,
                    style: AppTypography.caption.copyWith(
                      color: context.colors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🔽 APP DROPDOWN — dropdown consistente com visual DS
// ═══════════════════════════════════════════════════════════
class AppDropdown<T> extends StatelessWidget {
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? hint;
  final IconData? prefixIcon;

  const AppDropdown({
    super.key,
    required this.items,
    this.value,
    this.onChanged,
    this.hint,
    this.prefixIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x3),
      decoration: BoxDecoration(
        color: context.colors.bgInput,
        borderRadius: AppRadius.mdR,
        border: Border.all(color: context.colors.borderSubtle),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (prefixIcon != null) ...[
            Icon(prefixIcon, size: 16, color: context.colors.textMuted),
            const SizedBox(width: AppSpacing.x2),
          ],
          Flexible(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<T>(
                value: value,
                items: items,
                onChanged: onChanged,
                hint: hint != null
                    ? Text(hint!,
                        style: AppTypography.bodySmall
                            .copyWith(color: context.colors.textMuted))
                    : null,
                style: AppTypography.bodySmall
                    .copyWith(color: context.colors.textPrimary),
                dropdownColor: context.colors.bgCard,
                borderRadius: AppRadius.mdR,
                isDense: true,
                icon: Icon(Icons.keyboard_arrow_down,
                    size: 18, color: context.colors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 💠 _PULSING DOT — animated dot for live badge
// ═══════════════════════════════════════════════════════════
class _PulsingDot extends StatefulWidget {
  final Color color;
  const _PulsingDot({required this.color});
  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1800));
    _ctrl.repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _ctrl,
      builder: (context, child) => Transform.scale(
        scale: 1.0 + 0.4 * _ctrl.value,
        child: Container(
            width: 6,
            height: 6,
            decoration:
                BoxDecoration(color: widget.color, shape: BoxShape.circle)),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🍪 APP CHIP — filter pill
// ═══════════════════════════════════════════════════════════
class AppChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final Widget? trailing;

  const AppChip({
    super.key,
    required this.label,
    this.active = false,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: active ? context.colors.primarySoftBg : context.colors.bgCard,
          border: Border.all(
            color: active ? AppColors.primary : context.colors.borderSubtle,
          ),
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: active ? AppColors.primary : context.colors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 6),
              trailing!,
            ],
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🔘 APP SEGMENTED CONTROL
// ═══════════════════════════════════════════════════════════
class AppSegmentedControl<T> extends StatelessWidget {
  final List<T> segments;
  final T selected;
  final String Function(T) labelOf;
  final ValueChanged<T> onChanged;

  const AppSegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.labelOf,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.colors.bgMuted,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: segments.map((s) {
          final isActive = s == selected;
          return GestureDetector(
            onTap: () => onChanged(s),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? context.colors.bgCard : Colors.transparent,
                borderRadius: BorderRadius.circular(AppRadius.full),
                boxShadow: isActive ? AppShadows.sm : null,
              ),
              child: Text(
                labelOf(s),
                style: AppTypography.bodySmall.copyWith(
                  color: isActive
                      ? context.colors.textPrimary
                      : context.colors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 👤 APP GHOST BUTTON — outlined neutral button
// ═══════════════════════════════════════════════════════════
class AppGhostButton extends StatelessWidget {
  final String? label;
  final Widget? child;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;

  const AppGhostButton({
    super.key,
    this.label,
    this.child,
    this.icon,
    this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = isLoading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2))
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: context.colors.textPrimary),
                const SizedBox(width: AppSpacing.x2),
              ],
              if (child != null) child! else if (label != null) Text(label!),
            ],
          );

    return SizedBox(
      height: 40,
      child: OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: context.colors.textPrimary,
          side: BorderSide(color: context.colors.borderStrong),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.full)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        child: content,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 🚨 APP DANGER BUTTON — red CTA button
// ═══════════════════════════════════════════════════════════
class AppDangerButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool fullWidth;

  const AppDangerButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.white)),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18),
                const SizedBox(width: AppSpacing.x2),
              ],
              Text(label),
            ],
          );

    final button = SizedBox(
      height: 40,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.danger,
          foregroundColor: Colors.white,
          shadowColor: AppColors.danger.withValues(alpha: 0.45),
          elevation: 0,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.full)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        child: child,
      ),
    );
    return fullWidth ? SizedBox(width: double.infinity, child: button) : button;
  }
}

// ═══════════════════════════════════════════════════════════
// 👤 AVATAR GRADIENT TOPBAR — gradient avatar for header
// ═══════════════════════════════════════════════════════════
class AvatarGradientTopbar extends StatelessWidget {
  final String initials;
  final double size;

  const AvatarGradientTopbar({
    super.key,
    required this.initials,
    this.size = 40.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size / 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: size / 2.8,
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📋 APP TABLE — consistent data table component
// ═══════════════════════════════════════════════════════════
class AppTableColumn {
  final String label;
  final String align; // 'left', 'right', 'center'
  const AppTableColumn({required this.label, this.align = 'left'});
}

class AppTableRow {
  final List<Widget> cells;
  final VoidCallback? onTap;
  const AppTableRow({required this.cells, this.onTap});
}

class AppTable extends StatelessWidget {
  final List<AppTableColumn> columns;
  final List<AppTableRow> rows;
  final Widget? footer;
  final bool hoverHighlight;

  const AppTable({
    super.key,
    required this.columns,
    required this.rows,
    this.footer,
    this.hoverHighlight = true,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Table(
        columnWidths: {
          for (int i = 0; i < columns.length; i++)
            i: columns[i].align == 'right'
                ? const IntrinsicColumnWidth()
                : columns[i].align == 'center'
                    ? const IntrinsicColumnWidth()
                    : const FlexColumnWidth(),
        },
        defaultVerticalAlignment: TableCellVerticalAlignment.middle,
        children: [
          TableRow(
            decoration: BoxDecoration(
              color: context.colors.bgMuted,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(AppRadius.md),
                topRight: Radius.circular(AppRadius.md),
              ),
            ),
            children: columns.map((col) {
              final align = col.align == 'right'
                  ? Alignment.centerRight
                  : col.align == 'center'
                      ? Alignment.center
                      : Alignment.centerLeft;
              return Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Text(col.label,
                    style: AppTypography.tableTh,
                    textAlign: _alignToTextAlign(align)),
              );
            }).toList(),
          ),
          ...rows.map((row) {
            return TableRow(
              decoration: BoxDecoration(
                border: Border(
                    bottom: BorderSide(color: AppColors.hairline, width: 0.5)),
              ),
              children: row.cells.map((cell) {
                return InkWell(
                  onTap: row.onTap,
                  hoverColor: hoverHighlight
                      ? context.colors.primarySoftBg
                      : Colors.transparent,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    child: cell,
                  ),
                );
              }).toList(),
            );
          }),
          if (footer != null)
            TableRow(
              decoration: BoxDecoration(
                color: context.colors.primarySoftBg,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(AppRadius.md),
                  bottomRight: Radius.circular(AppRadius.md),
                ),
              ),
              // Footer deve ter o mesmo número de células das linhas acima,
              // senão o Flutter reclama com "Table contains irregular row lengths".
              children: List<Widget>.generate(
                columns.length,
                (i) => i == 0
                    ? Padding(
                        padding: const EdgeInsets.all(12),
                        child: footer,
                      )
                    : const SizedBox.shrink(),
              ),
            ),
        ],
      ),
    );
  }

  TextAlign _alignToTextAlign(Alignment align) {
    if (align == Alignment.centerRight) return TextAlign.right;
    if (align == Alignment.center) return TextAlign.center;
    return TextAlign.left;
  }
}

// ═══════════════════════════════════════════════════════════
// 🏆 SCORE RING — animated ring chart for excellence score
// ═══════════════════════════════════════════════════════════
class ScoreRing extends StatelessWidget {
  final int score; // 0-100
  final double size; // default 130

  const ScoreRing({super.key, required this.score, this.size = 130});

  @override
  Widget build(BuildContext context) {
    final color = score >= 80
        ? AppColors.success
        : score >= 50
            ? AppColors.warning
            : AppColors.danger;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _ScoreRingSvgPainter(score: score, color: color, bgMuted: context.colors.bgMuted),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$score',
                  style: AppTypography.h1.copyWith(
                      fontWeight: FontWeight.w800, fontSize: 26, color: color)),
              Text('SCORE',
                  style: AppTypography.caption
                      .copyWith(fontSize: 10, color: context.colors.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScoreRingSvgPainter extends CustomPainter {
  final int score;
  final Color color;
  final Color bgMuted;
  _ScoreRingSvgPainter({required this.score, required this.color, required this.bgMuted});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 10;
    const sw = 10.0;
    const startAngle = -math.pi / 2;

    final bg = Paint()
      ..color = bgMuted
      ..style = PaintingStyle.stroke
      ..strokeWidth = sw
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bg);

    if (score <= 0) return;
    final sweep = 2 * math.pi * (score / 100);
    final rect = Rect.fromCircle(center: center, radius: radius);
    final grad = SweepGradient(
      startAngle: startAngle,
      endAngle: startAngle + sweep,
      colors: [color.withValues(alpha: 0.5), color],
      stops: const [0.0, 1.0],
      transform: GradientRotation(startAngle),
    );
    final arc = Paint()
      ..shader = grad.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = sw
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, startAngle, sweep, false, arc);
  }

  @override
  bool shouldRepaint(covariant _ScoreRingSvgPainter old) =>
      old.score != score || old.color != color || old.bgMuted != bgMuted;
}

// ═══════════════════════════════════════════════════════════
// 📊 KPI ACCENT CARD — metric card with optional accent border
// ═══════════════════════════════════════════════════════════
class KpiAccentCard extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final Color? valueColor;
  final String? prefix;
  final bool accentTop;
  final bool isLive;

  const KpiAccentCard({
    super.key,
    required this.label,
    required this.value,
    this.sub,
    this.valueColor,
    this.prefix,
    this.accentTop = false,
    this.isLive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.bgCard,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border(
          top: accentTop
              ? BorderSide(color: AppColors.primary, width: 2)
              : BorderSide.none,
          left: BorderSide.none,
          right: BorderSide.none,
          bottom: BorderSide.none,
        ),
        boxShadow: AppShadows.md,
      ),
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                  child:
                      Text(label.toUpperCase(), style: AppTypography.kpiLabel)),
              if (isLive)
                AppBadge(
                    label: '● LIVE', type: AppBadgeType.live, showDot: false),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (prefix != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(prefix!,
                      style: AppTypography.caption
                          .copyWith(color: context.colors.textMuted)),
                ),
              Text(value,
                  style: AppTypography.kpiValue
                      .copyWith(color: valueColor ?? context.colors.textPrimary)),
            ],
          ),
          if (sub != null) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(sub!,
                style:
                    AppTypography.caption.copyWith(color: context.colors.textMuted)),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 💰 KPI FIN CARD — financial metric card with tone dot
// ═══════════════════════════════════════════════════════════
enum KpiFinTone { info, success, danger }

class KpiFinCard extends StatelessWidget {
  final String label;
  final String prefix;
  final String value;
  final KpiFinTone tone;
  final String sub;

  const KpiFinCard({
    super.key,
    required this.label,
    this.prefix = 'R\$',
    required this.value,
    this.tone = KpiFinTone.info,
    required this.sub,
  });

  @override
  Widget build(BuildContext context) {
    final toneColor = switch (tone) {
      KpiFinTone.success => AppColors.success,
      KpiFinTone.danger => AppColors.danger,
      KpiFinTone.info => AppColors.info,
    };
    return Container(
      decoration: BoxDecoration(
          color: context.colors.bgCard,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          boxShadow: AppShadows.md),
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                  child:
                      Text(label.toUpperCase(), style: AppTypography.kpiLabel)),
              Container(
                  width: 6,
                  height: 6,
                  decoration:
                      BoxDecoration(color: toneColor, shape: BoxShape.circle)),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(prefix,
              style:
                  AppTypography.caption.copyWith(color: context.colors.textMuted)),
          Text(value,
              style: AppTypography.h2
                  .copyWith(fontWeight: FontWeight.w700, color: toneColor)),
          const SizedBox(height: AppSpacing.x1),
          Text(sub,
              style:
                  AppTypography.caption.copyWith(color: context.colors.textMuted)),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📈 BIG KPI — large KPI card with icon and delta
// ═══════════════════════════════════════════════════════════
enum DeltaTone { up, down, neutral }

class BigKpi extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? delta;
  final DeltaTone deltaTone;

  const BigKpi({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.delta,
    this.deltaTone = DeltaTone.neutral,
  });

  @override
  Widget build(BuildContext context) {
    final deltaColor = switch (deltaTone) {
      DeltaTone.up => AppColors.success,
      DeltaTone.down => AppColors.danger,
      DeltaTone.neutral => context.colors.textMuted,
    };
    return Container(
      decoration: BoxDecoration(
          color: context.colors.bgCard,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          boxShadow: AppShadows.md),
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                    color: context.colors.primarySoftBg,
                    borderRadius: AppRadius.smR),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.x3),
              Expanded(
                  child:
                      Text(label.toUpperCase(), style: AppTypography.kpiLabel)),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(value,
              style: AppTypography.h2.copyWith(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.025,
                  color: context.colors.textPrimary)),
          if (delta != null) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(delta!,
                style: AppTypography.caption
                    .copyWith(color: deltaColor, fontWeight: FontWeight.w500)),
          ],
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 CHART CARD — wrapper for chart widgets with card styling
// ═══════════════════════════════════════════════════════════
class ChartCard extends StatelessWidget {
  final String title;
  final String? sub;
  final Widget child;

  const ChartCard(
      {super.key, required this.title, this.sub, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.colors.primarySoftBg,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: context.colors.borderSubtle),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: AppTypography.bodyLarge
                  .copyWith(fontWeight: FontWeight.w600)),
          if (sub != null) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(sub!,
                style:
                    AppTypography.caption.copyWith(color: context.colors.textMuted)),
          ],
          const SizedBox(height: AppSpacing.x4),
          child,
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// 📊 METRIC CARD REBRAND — rebrand-ready metric card
// ═══════════════════════════════════════════════════════════
class MetricCardRebrand extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color toneColor;
  final String sub;
  final String? target;

  const MetricCardRebrand({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.toneColor,
    required this.sub,
    this.target,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: context.colors.bgCard,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          boxShadow: AppShadows.md),
      padding: const EdgeInsets.all(AppSpacing.x5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                    color: context.colors.primarySoftBg,
                    borderRadius: AppRadius.smR),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const Spacer(),
              if (target != null)
                Text(target!,
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted, fontSize: 10)),
            ],
          ),
          const SizedBox(height: AppSpacing.x4),
          Text(label.toUpperCase(), style: AppTypography.kpiLabel),
          const SizedBox(height: AppSpacing.x2),
          Text(value,
              style: AppTypography.h2
                  .copyWith(fontWeight: FontWeight.w700, color: toneColor)),
          const SizedBox(height: AppSpacing.x1),
          Text(sub,
              style:
                  AppTypography.caption.copyWith(color: context.colors.textMuted)),
        ],
      ),
    );
  }
}
class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String? delta;
  final bool? deltaPositive;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    this.deltaPositive,
    this.subtitle,
    this.icon,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x5),
      shadow: AppShadows.sm,
      borderColor: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              if (icon != null)
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: context.colors.bgMuted,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: 18,
                    color: iconColor ?? AppColors.primary,
                  ),
                ),
              if (icon != null) const SizedBox(width: AppSpacing.x3),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodyLarge.copyWith(
                    color: context.colors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    maxLines: 1,
                    style: AppTypography.h2.copyWith(
                      color: context.colors.textPrimary,
                    ),
                  ),
                ),
              ),
              if (delta != null || subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    delta ?? subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.caption.copyWith(
                      color: delta != null
                          ? ((deltaPositive ?? true) ? AppColors.success : AppColors.danger)
                          : context.colors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

