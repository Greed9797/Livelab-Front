// =============================================================
// Onboarding wizard — fiel ao handoff "Livelab Onboarding.html"
// 3 páginas: Welcome → Form (15 campos) → Success
// Visual: peachy radial-gradient bg + card central com tokens replicados
// de :root no handoff. PopScope canPop:false (obrigatório).
// =============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../providers/auth_provider.dart';
import '../../providers/onboarding_provider.dart';

class _LL {
  static const primary       = Color(0xFFFF5A1F);
  static const primaryHover  = Color(0xFFE64A0F);
  static const primaryLight  = Color(0xFFFF7A42);
  static const primarySoft   = Color(0xFFFFE8DC);
  static const primarySofter = Color(0xFFFFF3EC);

  static const bgBase        = Color(0xFFFDF6F1);
  static const bgCard        = Color(0xFFFFFFFF);
  static const bgInput       = Color(0xFFF7EFE8);
  static const bgMuted       = Color(0xFFF5EBE3);

  static const textPrimary     = Color(0xFF1A1A1A);
  static const textSecondary   = Color(0xFF4A4A4A);
  static const textMuted       = Color(0xFF8A8A8A);
  static const textPlaceholder = Color(0xFFB6ADA6);

  static const border       = Color(0x141A1A1A);
  static const borderInput  = Color(0x1A1A1A1A);
  static const borderStrong = Color(0x261A1A1A);

  static const success = Color(0xFF1F9D55);
  static const successBg = Color(0xFFD9F2E1);
  static const danger  = Color(0xFFD9402F);

  static const radiusSm = 8.0;
  static const radiusMd = 12.0;
  static const radiusXl = 20.0;
  static const radiusPill = 999.0;

  static const shadowMd = [
    BoxShadow(color: Color(0x0F1A1A1A), blurRadius: 24, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x0A1A1A1A), blurRadius: 2, offset: Offset(0, 1)),
  ];

  static const shadowLg = [
    BoxShadow(color: Color(0x1A1A1A1A), blurRadius: 48, offset: Offset(0, 24), spreadRadius: -12),
    BoxShadow(color: Color(0x0F1A1A1A), blurRadius: 16, offset: Offset(0, 8), spreadRadius: -8),
  ];

  static const shadowPrimary = [
    BoxShadow(color: Color(0x73FF5A1F), blurRadius: 24, offset: Offset(0, 10), spreadRadius: -8),
  ];
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _page = 0; // 0=welcome, 1=form, 2=success

  Future<void> _finish() async {
    await ref.read(authProvider.notifier).completeOnboarding();
  }

  @override
  Widget build(BuildContext context) {
    final inter = GoogleFonts.interTextTheme();
    return PopScope(
      canPop: false,
      child: Theme(
        data: Theme.of(context).copyWith(textTheme: inter, primaryTextTheme: inter),
        child: Scaffold(
          backgroundColor: _LL.bgBase,
          body: Stack(
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment(0, -1.4),
                      radius: 1.4,
                      colors: [_LL.primarySoft, _LL.bgBase],
                      stops: [0.0, 0.55],
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: _page == 0
                    ? _WelcomePage(onStart: () => setState(() => _page = 1))
                    : _page == 1
                        ? _FormPage(
                            onBack: () => setState(() => _page = 0),
                            onSuccess: () => setState(() => _page = 2),
                          )
                        : _SuccessPage(onDone: _finish),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================
// WELCOME (page 1)
// =============================================================

class _WelcomePage extends StatelessWidget {
  final VoidCallback onStart;
  const _WelcomePage({required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: _PeachCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const _BrandLogo(),
                const SizedBox(height: 24),
                const _Eyebrow(text: 'PAINEL DO PARCEIRO', centered: true),
                const SizedBox(height: 12),
                _BigTitle.split(
                  bold: 'Bem-vindo(a) ao ',
                  serif: 'Livelabs',
                ),
                const SizedBox(height: 14),
                Text(
                  'Antes de começar, precisamos conhecer melhor o seu negócio. Leva uns 5 minutos — só perguntas essenciais para a equipe planejar suas lives.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: _LL.textSecondary,
                    height: 1.55,
                  ),
                ),
                const SizedBox(height: 32),
                _PrimaryButton(label: 'Começar', icon: Icons.arrow_forward_rounded, onTap: onStart),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================
// FORM (page 2)
// =============================================================

class _FormPage extends ConsumerStatefulWidget {
  final VoidCallback onBack;
  final VoidCallback onSuccess;
  const _FormPage({required this.onBack, required this.onSuccess});

  @override
  ConsumerState<_FormPage> createState() => _FormPageState();
}

class _FormPageState extends ConsumerState<_FormPage> {
  final _ctrl = <String, TextEditingController>{};
  final _focus = <String, FocusNode>{};
  String _liveExperience = 'none';
  bool _submitting = false;

  static const _required = [
    ('company_name', 'Nome da empresa', 'Razão social ou nome fantasia'),
    ('responsible_name', 'Responsável principal', 'Quem coordena as lives'),
    ('main_products', 'Produtos principais', 'Categorias / linhas que mais vende'),
    ('sales_history', 'Histórico de vendas', 'Faturamento médio dos últimos meses'),
    ('focus_products', 'Produtos para focar agora', 'O que quer empurrar nas próximas lives'),
    ('current_stock', 'Estoque disponível', 'Quantidade aproximada / SKUs prontos'),
    ('product_margin', 'Margem dos produtos', 'Ex: 30% líquido após custos'),
    ('gmv_expectation', 'Expectativa de GMV', 'Meta mensal estimada'),
    ('traffic_budget', 'Verba de tráfego (GMV Max)', 'Orçamento mensal previsto'),
  ];

  static const _optional = [
    ('website_url', 'Site da empresa', 'https://...'),
    ('instagram_url', 'Instagram', '@perfil ou link'),
    ('tiktok_url', 'TikTok', '@perfil ou link'),
    ('tiktok_shop_url', 'TikTok Shop', 'Link da loja'),
    ('available_offers', 'Ofertas / cupons / combos', 'Promoções vigentes'),
  ];

  static const _multiline = {
    'main_products',
    'sales_history',
    'focus_products',
    'current_stock',
    'available_offers',
  };

  @override
  void initState() {
    super.initState();
    for (final f in [..._required, ..._optional]) {
      _ctrl[f.$1] = TextEditingController();
      _focus[f.$1] = FocusNode()..addListener(() => setState(() {}));
      _ctrl[f.$1]!.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in _ctrl.values) {
      c.dispose();
    }
    for (final f in _focus.values) {
      f.dispose();
    }
    super.dispose();
  }

  bool get _requiredFilled => _required.every((f) => _ctrl[f.$1]!.text.trim().isNotEmpty);

  int get _filledCount => _required.where((f) => _ctrl[f.$1]!.text.trim().isNotEmpty).length;

  double get _progress => _filledCount / _required.length;

  Future<void> _submit() async {
    if (!_requiredFilled) return;
    setState(() => _submitting = true);

    final data = <String, dynamic>{'live_experience': _liveExperience};
    for (final f in [..._required, ..._optional]) {
      final v = _ctrl[f.$1]!.text.trim();
      data[f.$1] = v.isEmpty ? null : v;
    }

    final ok = await ref.read(onboardingProvider.notifier).submit(data);

    if (!mounted) return;
    setState(() => _submitting = false);

    if (ok) {
      widget.onSuccess();
    } else {
      final err = ref.read(onboardingProvider).error ?? 'Erro ao enviar.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: _LL.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 880),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(_LL.radiusXl),
            child: Container(
              decoration: BoxDecoration(
                color: _LL.bgCard,
                borderRadius: BorderRadius.circular(_LL.radiusXl),
                border: Border.all(color: _LL.border),
                boxShadow: _LL.shadowMd,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _FormHeader(filled: _filledCount, total: _required.length, progress: _progress),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(36, 24, 36, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _SectionTitle(text: 'Informações da empresa'),
                        const SizedBox(height: 16),
                        _ResponsiveGrid(
                          children: _required
                              .map((f) => _LLField(
                                    label: f.$2,
                                    hint: f.$3,
                                    controller: _ctrl[f.$1]!,
                                    focusNode: _focus[f.$1]!,
                                    required: true,
                                    multiline: _multiline.contains(f.$1),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 28),
                        const _SectionTitle(
                          text: 'Canais e ofertas',
                          tag: 'opcional',
                        ),
                        const SizedBox(height: 16),
                        _ResponsiveGrid(
                          children: _optional
                              .map((f) => _LLField(
                                    label: f.$2,
                                    hint: f.$3,
                                    controller: _ctrl[f.$1]!,
                                    focusNode: _focus[f.$1]!,
                                    required: false,
                                    multiline: _multiline.contains(f.$1),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 28),
                        const _SectionTitle(text: 'Sua experiência com lives'),
                        const SizedBox(height: 16),
                        _LLDropdown(
                          label: 'Experiência anterior com live',
                          value: _liveExperience,
                          onChanged: (v) => setState(() => _liveExperience = v ?? 'none'),
                        ),
                      ],
                    ),
                  ),
                  _SubmitBar(
                    onBack: widget.onBack,
                    enabled: _requiredFilled && !_submitting,
                    loading: _submitting,
                    onSubmit: _submit,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FormHeader extends StatelessWidget {
  final int filled;
  final int total;
  final double progress;
  const _FormHeader({required this.filled, required this.total, required this.progress});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(36, 28, 36, 24),
      decoration: const BoxDecoration(
        color: _LL.primarySofter,
        border: Border(bottom: BorderSide(color: _LL.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Eyebrow(text: 'FORMULÁRIO DE ONBOARDING'),
          const SizedBox(height: 8),
          RichText(
            text: TextSpan(
              style: GoogleFonts.inter(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: _LL.textPrimary,
                letterSpacing: -0.7,
                height: 1.15,
              ),
              children: [
                const TextSpan(text: 'Conte sobre seu '),
                TextSpan(
                  text: 'negócio',
                  style: GoogleFonts.instrumentSerif(
                    fontSize: 32,
                    fontWeight: FontWeight.w400,
                    fontStyle: FontStyle.italic,
                    color: _LL.primary,
                    height: 1.0,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Estas respostas alimentam o time Livelabs para preparar suas primeiras lives.',
            style: GoogleFonts.inter(fontSize: 14, color: _LL.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: SizedBox(
                    height: 6,
                    child: Stack(
                      children: [
                        Container(color: _LL.bgMuted),
                        FractionallySizedBox(
                          widthFactor: progress.clamp(0.0, 1.0),
                          alignment: Alignment.centerLeft,
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [_LL.primary, _LL.primaryLight],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '$filled/$total obrigatórios',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _LL.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =============================================================
// SUCCESS (page 3)
// =============================================================

class _SuccessPage extends StatelessWidget {
  final VoidCallback onDone;
  const _SuccessPage({required this.onDone});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: _PeachCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(
                    color: _LL.successBg,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.check_rounded, color: _LL.success, size: 40),
                ),
                const SizedBox(height: 24),
                const _Eyebrow(text: 'TUDO PRONTO', centered: true),
                const SizedBox(height: 12),
                _BigTitle.split(
                  bold: 'Obrigado(a) por ',
                  serif: 'compartilhar',
                ),
                const SizedBox(height: 14),
                Text(
                  'Sua equipe Livelabs já recebeu suas informações e vai começar a trabalhar com você.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 14, color: _LL.textSecondary, height: 1.55),
                ),
                const SizedBox(height: 32),
                _PrimaryButton(label: 'Ir para o painel', icon: Icons.arrow_forward_rounded, onTap: onDone),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================
// PRIMITIVES
// =============================================================

class _PeachCard extends StatelessWidget {
  final Widget child;
  const _PeachCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(_LL.radiusXl),
      child: Container(
        decoration: BoxDecoration(
          color: _LL.bgCard,
          borderRadius: BorderRadius.circular(_LL.radiusXl),
          border: Border.all(color: _LL.border),
          boxShadow: _LL.shadowLg,
        ),
        child: Stack(
          children: [
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
              child: child,
            ),
          ],
        ),
      ),
    );
  }
}

class _BrandLogo extends StatelessWidget {
  const _BrandLogo();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x59FF5A1F), blurRadius: 22, offset: Offset(0, 10), spreadRadius: -6),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.asset(
          'assets/images/favicon.png',
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}

class _Eyebrow extends StatelessWidget {
  final String text;
  final bool centered;
  const _Eyebrow({required this.text, this.centered = false});

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[
      if (centered) Container(width: 16, height: 1, color: _LL.primary.withValues(alpha: 0.5)),
      if (!centered) Container(width: 18, height: 1, color: _LL.primary),
      const SizedBox(width: 8),
      Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: _LL.primary,
          letterSpacing: centered ? 1.98 : 1.76,
        ),
      ),
      if (centered) ...[
        const SizedBox(width: 8),
        Container(width: 16, height: 1, color: _LL.primary.withValues(alpha: 0.5)),
      ],
    ];
    return Row(
      mainAxisAlignment: centered ? MainAxisAlignment.center : MainAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

class _BigTitle extends StatelessWidget {
  final String bold;
  final String serif;
  const _BigTitle.split({required this.bold, required this.serif});

  @override
  Widget build(BuildContext context) {
    return RichText(
      textAlign: TextAlign.center,
      text: TextSpan(
        style: GoogleFonts.inter(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          color: _LL.textPrimary,
          letterSpacing: -1.08,
          height: 1.1,
        ),
        children: [
          TextSpan(text: bold),
          TextSpan(
            text: serif,
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

class _SectionTitle extends StatelessWidget {
  final String text;
  final String? tag;
  const _SectionTitle({required this.text, this.tag});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(width: 4, height: 18, decoration: BoxDecoration(color: _LL.primary, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 10),
        Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: _LL.textPrimary,
            letterSpacing: -0.2,
          ),
        ),
        if (tag != null) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: _LL.bgMuted,
              borderRadius: BorderRadius.circular(_LL.radiusSm),
            ),
            child: Text(
              tag!,
              style: GoogleFonts.inter(fontSize: 10.5, fontWeight: FontWeight.w600, color: _LL.textMuted, letterSpacing: 0.4),
            ),
          ),
        ],
      ],
    );
  }
}

class _ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  const _ResponsiveGrid({required this.children});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (ctx, c) {
      final twoCol = c.maxWidth >= 600;
      const gap = 16.0;
      if (!twoCol) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (int i = 0; i < children.length; i++) ...[
              if (i > 0) const SizedBox(height: gap),
              children[i],
            ],
          ],
        );
      }
      final width = (c.maxWidth - gap) / 2;
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: children.map((w) => SizedBox(width: width, child: w)).toList(),
      );
    });
  }
}

class _LLField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool required;
  final bool multiline;

  const _LLField({
    required this.label,
    required this.controller,
    required this.focusNode,
    this.hint,
    this.required = false,
    this.multiline = false,
  });

  @override
  Widget build(BuildContext context) {
    final focused = focusNode.hasFocus;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            text: label,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: _LL.textSecondary,
              letterSpacing: 0.1,
            ),
            children: required
                ? [
                    TextSpan(
                      text: ' *',
                      style: GoogleFonts.inter(color: _LL.primary, fontWeight: FontWeight.w700),
                    )
                  ]
                : const [],
          ),
        ),
        const SizedBox(height: 6),
        AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: focused ? Colors.white : _LL.bgInput,
            borderRadius: BorderRadius.circular(_LL.radiusMd),
            border: Border.all(color: focused ? _LL.primary : _LL.borderInput),
            boxShadow: focused ? const [BoxShadow(color: _LL.primarySofter, spreadRadius: 4)] : null,
          ),
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            minLines: multiline ? 3 : 1,
            maxLines: multiline ? 5 : 1,
            cursorColor: _LL.primary,
            style: GoogleFonts.inter(fontSize: 14, color: _LL.textPrimary),
            decoration: InputDecoration(
              isDense: true,
              hintText: hint,
              hintStyle: GoogleFonts.inter(fontSize: 13.5, color: _LL.textPlaceholder),
              contentPadding: EdgeInsets.symmetric(
                horizontal: 14,
                vertical: multiline ? 12 : 14,
              ),
              border: InputBorder.none,
              focusedBorder: InputBorder.none,
              enabledBorder: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }
}

class _LLDropdown extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String?> onChanged;
  const _LLDropdown({required this.label, required this.value, required this.onChanged});

  static const _items = [
    ('none', 'Nenhuma — primeira vez'),
    ('low', 'Pouca — algumas tentativas'),
    ('moderate', 'Moderada — já fiz lives regulares'),
    ('advanced', 'Avançada — opero lives há tempo'),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            text: label,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: _LL.textSecondary,
              letterSpacing: 0.1,
            ),
            children: [
              TextSpan(
                text: ' *',
                style: GoogleFonts.inter(color: _LL.primary, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: _LL.bgInput,
            borderRadius: BorderRadius.circular(_LL.radiusMd),
            border: Border.all(color: _LL.borderInput),
          ),
          child: DropdownButtonHideUnderline(
            child: ButtonTheme(
              alignedDropdown: true,
              child: DropdownButton<String>(
                value: value,
                onChanged: onChanged,
                isExpanded: true,
                icon: const Icon(Icons.keyboard_arrow_down_rounded, color: _LL.textMuted),
                style: GoogleFonts.inter(fontSize: 14, color: _LL.textPrimary),
                dropdownColor: _LL.bgCard,
                borderRadius: BorderRadius.circular(_LL.radiusMd),
                items: _items
                    .map((e) => DropdownMenuItem(
                          value: e.$1,
                          child: Text(e.$2),
                        ))
                    .toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SubmitBar extends StatelessWidget {
  final VoidCallback onBack;
  final bool enabled;
  final bool loading;
  final VoidCallback onSubmit;
  const _SubmitBar({
    required this.onBack,
    required this.enabled,
    required this.loading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(36, 18, 36, 24),
      decoration: const BoxDecoration(
        color: _LL.bgCard,
        border: Border(top: BorderSide(color: _LL.border)),
      ),
      child: Row(
        children: [
          _GhostButton(label: 'Voltar', onTap: onBack),
          const Spacer(),
          if (!enabled && !loading)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                'Preencha todos os campos obrigatórios',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: _LL.textMuted,
                ),
              ),
            ),
          _PrimaryButton(
            label: loading ? 'Enviando…' : 'Enviar informações',
            icon: loading ? null : Icons.arrow_forward_rounded,
            onTap: enabled ? onSubmit : null,
          ),
        ],
      ),
    );
  }
}

class _GhostButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  const _GhostButton({required this.label, required this.onTap});

  @override
  State<_GhostButton> createState() => _GhostButtonState();
}

class _GhostButtonState extends State<_GhostButton> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 22),
          decoration: BoxDecoration(
            color: _hover ? _LL.bgMuted : _LL.bgCard,
            borderRadius: BorderRadius.circular(_LL.radiusPill),
            border: Border.all(color: _LL.borderStrong),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.arrow_back_rounded, color: _LL.textPrimary, size: 16),
              const SizedBox(width: 6),
              Text(
                widget.label,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _LL.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  const _PrimaryButton({required this.label, required this.icon, required this.onTap});

  @override
  State<_PrimaryButton> createState() => _PrimaryButtonState();
}

class _PrimaryButtonState extends State<_PrimaryButton> {
  bool _hover = false;
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onTap == null;
    final dy = _down ? 0.0 : (_hover && !disabled ? -1.0 : 0.0);
    final bg = disabled ? _LL.borderStrong : (_hover || _down ? _LL.primaryHover : _LL.primary);
    return MouseRegion(
      cursor: disabled ? SystemMouseCursors.basic : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: GestureDetector(
        onTapDown: disabled ? null : (_) => setState(() => _down = true),
        onTapUp: disabled ? null : (_) => setState(() => _down = false),
        onTapCancel: () => setState(() => _down = false),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: 28),
          transform: Matrix4.translationValues(0, dy, 0),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(_LL.radiusPill),
            boxShadow: disabled ? null : _LL.shadowPrimary,
          ),
          alignment: Alignment.center,
          child: Row(
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
              if (widget.icon != null) ...[
                const SizedBox(width: 8),
                Icon(widget.icon, color: Colors.white, size: 18),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
