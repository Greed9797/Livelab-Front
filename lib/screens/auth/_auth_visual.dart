// =============================================================
// Auth visual primitives — compartilhados pelas telas públicas
// (login, esqueci-senha, redefinir-senha, aceitar-convite).
// Mesma identidade peachy radial-gradient + welcome card do login.
// =============================================================

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LL {
  LL._();

  static const primary = Color(0xFFFF5A1F);
  static const primaryHover = Color(0xFFE64A0F);
  static const primarySoft = Color(0xFFFFE8DC);
  static const primarySofter = Color(0xFFFFF3EC);
  static const danger = Color(0xFFD9402F);
  static const success = Color(0xFF10B981);

  static bool _isDark(BuildContext c) =>
      Theme.of(c).brightness == Brightness.dark;

  static Color bgBase(BuildContext c) =>
      _isDark(c) ? const Color(0xFF0E0E10) : const Color(0xFFFDF6F1);
  static Color bgCard(BuildContext c) =>
      _isDark(c) ? const Color(0xFF18181B) : const Color(0xFFFFFFFF);
  static Color bgInput(BuildContext c) =>
      _isDark(c) ? const Color(0xFF26262B) : const Color(0xFFF7EFE8);

  static Color textPrimary(BuildContext c) =>
      _isDark(c) ? const Color(0xFFF5F0EB) : const Color(0xFF1A1A1A);
  static Color textSecondary(BuildContext c) =>
      _isDark(c) ? const Color(0xFFB8B2AC) : const Color(0xFF4A4A4A);
  static Color textMuted(BuildContext c) =>
      _isDark(c) ? const Color(0xFF75716D) : const Color(0xFF8A8A8A);
  static Color textPlaceholder(BuildContext c) =>
      _isDark(c) ? const Color(0xFF55535F) : const Color(0xFFB6ADA6);

  static Color border(BuildContext c) =>
      _isDark(c) ? const Color(0x1AFFFFFF) : const Color(0x141A1A1A);
  static Color borderInput(BuildContext c) =>
      _isDark(c) ? const Color(0x26FFFFFF) : const Color(0x1A1A1A1A);

  static const radiusMd = 12.0;
  static const radiusXl = 20.0;
  static const radiusPill = 999.0;

  static const shadowLg = [
    BoxShadow(
      color: Color(0x1A1A1A1A),
      blurRadius: 48,
      offset: Offset(0, 24),
      spreadRadius: -12,
    ),
    BoxShadow(
      color: Color(0x0F1A1A1A),
      blurRadius: 16,
      offset: Offset(0, 8),
      spreadRadius: -8,
    ),
  ];

  static const shadowPrimary = [
    BoxShadow(
      color: Color(0x73FF5A1F),
      blurRadius: 24,
      offset: Offset(0, 10),
      spreadRadius: -8,
    ),
  ];
}

/// Scaffold padrão das telas públicas de auth.
class AuthScaffold extends StatelessWidget {
  final Widget child;
  const AuthScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final inter = GoogleFonts.interTextTheme();
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: inter,
        primaryTextTheme: inter,
      ),
      child: Scaffold(
        backgroundColor: LL.bgBase(context),
        body: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -1.4),
                    radius: 1.4,
                    colors: [LL.primarySoft, LL.bgBase(context)],
                    stops: const [0.0, 0.55],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 32,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: AuthCard(child: child),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AuthCard extends StatelessWidget {
  final Widget child;
  const AuthCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(LL.radiusXl),
      child: Container(
        decoration: BoxDecoration(
          color: LL.bgCard(context),
          borderRadius: BorderRadius.circular(LL.radiusXl),
          border: Border.all(color: LL.border(context)),
          boxShadow: LL.shadowLg,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(40, 48, 40, 40),
          child: child,
        ),
      ),
    );
  }
}

class AuthHeader extends StatelessWidget {
  final String eyebrow;
  final String titlePrefix;
  final String titleAccent;
  final String? subtitle;

  const AuthHeader({
    super.key,
    required this.eyebrow,
    required this.titlePrefix,
    required this.titleAccent,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x59FF5A1F),
                  blurRadius: 22,
                  offset: Offset(0, 10),
                  spreadRadius: -6,
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset('assets/images/favicon.png', fit: BoxFit.cover),
            ),
          ),
        ),
        const SizedBox(height: 22),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 16,
              height: 1,
              color: LL.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(width: 8),
            Text(
              eyebrow,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: LL.primary,
                letterSpacing: 1.98,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 16,
              height: 1,
              color: LL.primary.withValues(alpha: 0.5),
            ),
          ],
        ),
        const SizedBox(height: 12),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: GoogleFonts.inter(
              fontSize: 30,
              fontWeight: FontWeight.w700,
              color: LL.textPrimary(context),
              letterSpacing: -1.0,
              height: 1.15,
            ),
            children: [
              TextSpan(text: '$titlePrefix '),
              TextSpan(
                text: titleAccent,
                style: GoogleFonts.instrumentSerif(
                  fontSize: 34,
                  fontWeight: FontWeight.w400,
                  fontStyle: FontStyle.italic,
                  color: LL.primary,
                  height: 1.0,
                ),
              ),
            ],
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 12),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13.5,
              color: LL.textSecondary(context),
              height: 1.5,
            ),
          ),
        ],
      ],
    );
  }
}

class AuthField extends StatefulWidget {
  final String label;
  final String? hint;
  final TextEditingController controller;
  final bool obscure;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;

  const AuthField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.onSubmitted,
    this.autofocus = false,
  });

  @override
  State<AuthField> createState() => _AuthFieldState();
}

class _AuthFieldState extends State<AuthField> {
  final _focus = FocusNode();
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final focused = _focus.hasFocus;
    final isPassword = widget.obscure;
    final hideText = isPassword && !_showPassword;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: GoogleFonts.inter(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: LL.textSecondary(context),
            letterSpacing: 0.1,
          ),
        ),
        const SizedBox(height: 6),
        AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: focused ? Colors.white : LL.bgInput(context),
            borderRadius: BorderRadius.circular(LL.radiusMd),
            border: Border.all(
              color: focused ? LL.primary : LL.borderInput(context),
              width: 1,
            ),
            boxShadow: focused
                ? [
                    const BoxShadow(
                      color: LL.primarySofter,
                      blurRadius: 0,
                      spreadRadius: 4,
                    ),
                  ]
                : null,
          ),
          child: TextField(
            controller: widget.controller,
            focusNode: _focus,
            obscureText: hideText,
            keyboardType: widget.keyboardType,
            autofocus: widget.autofocus,
            onSubmitted: widget.onSubmitted,
            cursorColor: LL.primary,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: LL.textPrimary(context),
            ),
            decoration: InputDecoration(
              isDense: true,
              hintText: widget.hint,
              hintStyle: GoogleFonts.inter(
                fontSize: 14,
                color: LL.textPlaceholder(context),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 14,
              ),
              border: InputBorder.none,
              focusedBorder: InputBorder.none,
              enabledBorder: InputBorder.none,
              suffixIcon: isPassword
                  ? IconButton(
                      splashRadius: 20,
                      tooltip:
                          _showPassword ? 'Ocultar senha' : 'Mostrar senha',
                      icon: Icon(
                        _showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 18,
                        color: LL.textMuted(context),
                      ),
                      onPressed: () =>
                          setState(() => _showPassword = !_showPassword),
                    )
                  : null,
              suffixIconConstraints:
                  const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
          ),
        ),
      ],
    );
  }
}

class AuthErrorBanner extends StatelessWidget {
  final String message;
  const AuthErrorBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: LL.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(LL.radiusMd),
        border: Border.all(color: LL.danger.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: LL.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: LL.danger,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AuthSuccessBanner extends StatelessWidget {
  final String message;
  const AuthSuccessBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: LL.success.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(LL.radiusMd),
        border: Border.all(color: LL.success.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: LL.success, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: LL.textPrimary(context),
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AuthPrimaryButton extends StatefulWidget {
  final String label;
  final bool isLoading;
  final VoidCallback? onTap;
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.isLoading,
    required this.onTap,
  });

  @override
  State<AuthPrimaryButton> createState() => _AuthPrimaryButtonState();
}

class _AuthPrimaryButtonState extends State<AuthPrimaryButton> {
  bool _hover = false;
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final disabled = widget.isLoading || widget.onTap == null;
    final dy = _down ? 0.0 : (_hover ? -1.0 : 0.0);
    final bg = (_hover || _down) ? LL.primaryHover : LL.primary;
    return MouseRegion(
      cursor: disabled ? SystemMouseCursors.basic : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _down = true),
        onTapUp: (_) => setState(() => _down = false),
        onTapCancel: () => setState(() => _down = false),
        onTap: disabled ? null : widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          height: 52,
          transform: Matrix4.translationValues(0, dy, 0),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(LL.radiusPill),
            boxShadow: LL.shadowPrimary,
          ),
          alignment: Alignment.center,
          child: widget.isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                )
              : Text(
                  widget.label,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    letterSpacing: 0.1,
                  ),
                ),
        ),
      ),
    );
  }
}

class AuthBackToLogin extends StatelessWidget {
  final String label;
  const AuthBackToLogin({super.key, this.label = 'Voltar ao login'});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () =>
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: LL.primary,
        ),
      ),
    );
  }
}
