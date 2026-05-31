// =============================================================
// Login Screen — fiel ao handoff "Livelab Onboarding.html"
// Visual: peachy radial-gradient bg + welcome card centralizado
// (logo "L" box + eyebrow + serif italic title + soft inputs + pill button)
// Tokens replicados de :root no handoff.
// =============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers/auth_provider.dart';
import '../../routes/app_routes.dart';

const _kLastEmailKey = 'auth.last_email';
const _kRememberKey = 'auth.remember_email';
const _storage = FlutterSecureStorage();

class _LL {
  // Semânticos invariantes nos dois modos.
  static const primary       = Color(0xFFFF5A1F);
  static const primaryHover  = Color(0xFFE64A0F);
  static const primarySoft   = Color(0xFFFFE8DC);
  static const primarySofter = Color(0xFFFFF3EC);
  static const danger        = Color(0xFFD9402F);

  // Surface + text — theme-aware via BuildContext.
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

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _senhaCtrl = TextEditingController();
  final _emailFocus = FocusNode();
  final _senhaFocus = FocusNode();
  bool _obscure = true;
  bool _remember = false;
  String? _localError;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(() => setState(() {}));
    _senhaFocus.addListener(() => setState(() {}));
    _restoreRememberedEmail();
  }

  // F4: navega pra fluxo real de recuperação (email + token).
  void _goToForgotPassword(BuildContext ctx) {
    Navigator.of(ctx).pushNamed(AppRoutes.esqueciSenha);
  }

  Future<void> _restoreRememberedEmail() async {
    final remember = (await _storage.read(key: _kRememberKey)) == 'true';
    final lastEmail = await _storage.read(key: _kLastEmailKey);
    if (!mounted) return;
    setState(() {
      _remember = remember;
      if (remember && lastEmail != null && lastEmail.isNotEmpty) {
        _emailCtrl.text = lastEmail;
      }
    });
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _senhaCtrl.dispose();
    _emailFocus.dispose();
    _senhaFocus.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailCtrl.text.trim();
    final senha = _senhaCtrl.text;

    if (email.isEmpty || !email.contains('@') || !email.contains('.')) {
      setState(() => _localError = 'E-mail inválido.');
      return;
    }
    if (senha.isEmpty) {
      setState(() => _localError = 'Informe a senha.');
      return;
    }
    setState(() => _localError = null);

    final auth = ref.read(authProvider.notifier);
    final ok = await auth.login(email, senha);
    if (!mounted) return;

    if (ok) {
      // Persistir / limpar email lembrado conforme preferência
      await _storage.write(key: _kRememberKey, value: _remember ? 'true' : 'false');
      if (_remember) {
        await _storage.write(key: _kLastEmailKey, value: email);
      } else {
        await _storage.delete(key: _kLastEmailKey);
      }
      if (!mounted) return;
      final user = ref.read(authProvider).user!;
      final route = AppRoutes.routeForRole(
        user.papel,
        onboardingCompleted: user.onboardingCompleted,
      );
      Navigator.pushReplacementNamed(context, route);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.isLoading;
    final authError = _localError ?? authState.error;

    final inter = GoogleFonts.interTextTheme();
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: inter,
        primaryTextTheme: inter,
      ),
      child: Scaffold(
        backgroundColor: _LL.bgBase(context),
        body: Stack(
          children: [
            // radial-gradient(120% 80% at 50% -10%, primarySoft 0%, bgBase 55%)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -1.4),
                    radius: 1.4,
                    colors: [_LL.primarySoft, _LL.bgBase(context)],
                    stops: const [0.0, 0.55],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: _WelcomeCard(
                      child: _LoginForm(
                        emailCtrl: _emailCtrl,
                        senhaCtrl: _senhaCtrl,
                        emailFocus: _emailFocus,
                        senhaFocus: _senhaFocus,
                        obscure: _obscure,
                        onToggleObscure: () => setState(() => _obscure = !_obscure),
                        onSubmit: _login,
                        isLoading: isLoading,
                        error: authError,
                        remember: _remember,
                        onRememberChanged: (v) => setState(() => _remember = v),
                        onForgotPassword: () => _goToForgotPassword(context),
                      ),
                    ),
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

// =============================================================
// WELCOME CARD (replica .welcome do handoff)
// =============================================================

class _WelcomeCard extends StatelessWidget {
  final Widget child;
  const _WelcomeCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(_LL.radiusXl),
      child: Container(
        decoration: BoxDecoration(
          color: _LL.bgCard(context),
          borderRadius: BorderRadius.circular(_LL.radiusXl),
          border: Border.all(color: _LL.border(context)),
          boxShadow: _LL.shadowLg,
        ),
        child: Stack(
          children: [
            // welcome::before — radial glow primarySoft
            Positioned(
              top: -120,
              left: 0,
              right: 0,
              child: IgnorePointer(
                child: Center(
                  child: Container(
                    width: 320,
                    height: 320,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [_LL.primarySoft, Color(0x00FFE8DC)],
                        stops: [0.0, 0.7],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(48, 56, 48, 48),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _WelcomeLogo(),
                  const SizedBox(height: 24),
                  const _WelcomeEyebrow(),
                  const SizedBox(height: 12),
                  _WelcomeTitle(),
                  const SizedBox(height: 14),
                  Text(
                    'Acesse seu painel para acompanhar lives, métricas e sua carteira de clientes.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: _LL.textSecondary(context),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 32),
                  child,
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WelcomeLogo extends StatelessWidget {
  const _WelcomeLogo();

  @override
  Widget build(BuildContext context) {
    return Center(
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
          child: Image.asset(
            'assets/images/favicon.png',
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}

class _WelcomeEyebrow extends StatelessWidget {
  const _WelcomeEyebrow();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(width: 16, height: 1, color: _LL.primary.withValues(alpha: 0.5)),
        const SizedBox(width: 8),
        Text(
          'GESTÃO DE FRANQUIAS',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: _LL.primary,
            letterSpacing: 1.98,
          ),
        ),
        const SizedBox(width: 8),
        Container(width: 16, height: 1, color: _LL.primary.withValues(alpha: 0.5)),
      ],
    );
  }
}

class _WelcomeTitle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: GoogleFonts.inter(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          color: _LL.textPrimary(context),
          letterSpacing: -1.08,
          height: 1.1,
        ),
        children: [
          const TextSpan(text: 'Bem-vindo de '),
          TextSpan(
            text: 'volta',
            style: GoogleFonts.instrumentSerif(
              fontSize: 40,
              fontWeight: FontWeight.w400,
              fontStyle: FontStyle.italic,
              color: _LL.primary,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================
// FORM
// =============================================================

class _LoginForm extends StatelessWidget {
  final TextEditingController emailCtrl;
  final TextEditingController senhaCtrl;
  final FocusNode emailFocus;
  final FocusNode senhaFocus;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final VoidCallback onSubmit;
  final bool isLoading;
  final String? error;
  final bool remember;
  final ValueChanged<bool> onRememberChanged;
  final VoidCallback onForgotPassword;

  const _LoginForm({
    required this.emailCtrl,
    required this.senhaCtrl,
    required this.emailFocus,
    required this.senhaFocus,
    required this.obscure,
    required this.onToggleObscure,
    required this.onSubmit,
    required this.isLoading,
    required this.error,
    required this.remember,
    required this.onRememberChanged,
    required this.onForgotPassword,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _LLField(
          label: 'E-mail',
          controller: emailCtrl,
          focusNode: emailFocus,
          keyboardType: TextInputType.emailAddress,
          hint: 'voce@exemplo.com',
          fieldKey: const ValueKey('login_email'),
        ),
        const SizedBox(height: 16),
        _LLField(
          label: 'Senha',
          controller: senhaCtrl,
          focusNode: senhaFocus,
          obscure: obscure,
          hint: '••••••••',
          onSubmitted: (_) => onSubmit(),
          fieldKey: const ValueKey('login_senha'),
          suffix: IconButton(
            splashRadius: 20,
            tooltip: obscure ? 'Mostrar senha' : 'Ocultar senha',
            icon: Icon(
              obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
              size: 18,
              color: _LL.textMuted(context),
            ),
            onPressed: onToggleObscure,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            SizedBox(
              height: 22,
              width: 22,
              child: Checkbox(
                value: remember,
                onChanged: (v) => onRememberChanged(v ?? false),
                activeColor: _LL.primary,
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: () => onRememberChanged(!remember),
              child: Text('Lembrar e-mail',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    color: _LL.textSecondary(context),
                    fontWeight: FontWeight.w500,
                  )),
            ),
            const Spacer(),
            InkWell(
              key: const ValueKey('login_esqueci_senha'),
              onTap: onForgotPassword,
              child: Text('Esqueci a senha',
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    color: _LL.primary,
                    fontWeight: FontWeight.w600,
                  )),
            ),
          ],
        ),
        if (error != null) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _LL.danger.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(_LL.radiusMd),
              border: Border.all(color: _LL.danger.withValues(alpha: 0.18)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: _LL.danger, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    error!,
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      color: _LL.danger,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        _LLPrimaryButton(
          key: const ValueKey('login_submit'),
          label: 'Entrar',
          isLoading: isLoading,
          onTap: onSubmit,
        ),
      ],
    );
  }
}

class _LLField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool obscure;
  final TextInputType? keyboardType;
  final Widget? suffix;
  final ValueChanged<String>? onSubmitted;
  final Key? fieldKey;

  const _LLField({
    required this.label,
    required this.controller,
    required this.focusNode,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.suffix,
    this.onSubmitted,
    this.fieldKey,
  });

  @override
  Widget build(BuildContext context) {
    final focused = focusNode.hasFocus;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: _LL.textSecondary(context),
            letterSpacing: 0.1,
          ),
        ),
        const SizedBox(height: 6),
        AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: focused ? Colors.white : _LL.bgInput(context),
            borderRadius: BorderRadius.circular(_LL.radiusMd),
            border: Border.all(
              color: focused ? _LL.primary : _LL.borderInput(context),
              width: 1,
            ),
            boxShadow: focused
                ? [const BoxShadow(color: _LL.primarySofter, blurRadius: 0, spreadRadius: 4)]
                : null,
          ),
          child: TextField(
            key: fieldKey,
            controller: controller,
            focusNode: focusNode,
            obscureText: obscure,
            keyboardType: keyboardType,
            onSubmitted: onSubmitted,
            cursorColor: _LL.primary,
            style: GoogleFonts.inter(fontSize: 14, color: _LL.textPrimary(context)),
            decoration: InputDecoration(
              isDense: true,
              hintText: hint,
              hintStyle: GoogleFonts.inter(fontSize: 14, color: _LL.textPlaceholder(context)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              border: InputBorder.none,
              focusedBorder: InputBorder.none,
              enabledBorder: InputBorder.none,
              suffixIcon: suffix,
              suffixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
          ),
        ),
      ],
    );
  }
}

class _LLPrimaryButton extends StatefulWidget {
  final String label;
  final bool isLoading;
  final VoidCallback onTap;
  const _LLPrimaryButton({super.key, required this.label, required this.isLoading, required this.onTap});

  @override
  State<_LLPrimaryButton> createState() => _LLPrimaryButtonState();
}

class _LLPrimaryButtonState extends State<_LLPrimaryButton> {
  bool _hover = false;
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final dy = _down ? 0.0 : (_hover ? -1.0 : 0.0);
    final bg = (_hover || _down) ? _LL.primaryHover : _LL.primary;
    return MouseRegion(
      cursor: widget.isLoading ? SystemMouseCursors.basic : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _down = true),
        onTapUp: (_) => setState(() => _down = false),
        onTapCancel: () => setState(() => _down = false),
        onTap: widget.isLoading ? null : widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          height: 52,
          transform: Matrix4.translationValues(0, dy, 0),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(_LL.radiusPill),
            boxShadow: _LL.shadowPrimary,
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
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.label,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        letterSpacing: 0.1,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                  ],
                ),
        ),
      ),
    );
  }
}
