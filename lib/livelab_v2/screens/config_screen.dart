import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cliente_perfil_provider.dart';
import '../../services/api_service.dart';
import '../../utils/form_validators.dart';
import '../core/ll_theme.dart';
import '../widgets/ll_components.dart';

class ConfigScreen extends ConsumerStatefulWidget {
  const ConfigScreen({super.key});

  @override
  ConsumerState<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends ConsumerState<ConfigScreen> {
  String section = 'conta';
  bool showCurrent = false;
  bool showNew = false;
  bool showConfirm = false;
  bool savingPassword = false;

  final website = TextEditingController();
  final currentPassword = TextEditingController();
  final newPassword = TextEditingController();
  final confirmPassword = TextEditingController();

  @override
  void dispose() {
    website.dispose();
    currentPassword.dispose();
    newPassword.dispose();
    confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _onSavePassword() async {
    final atual = currentPassword.text.trim();
    final nova = newPassword.text.trim();
    final conf = confirmPassword.text.trim();

    if (atual.isEmpty || nova.isEmpty || conf.isEmpty) {
      _snack('Preencha todos os campos.', erro: true);
      return;
    }
    if (nova != conf) {
      _snack('A confirmação não bate com a nova senha.', erro: true);
      return;
    }
    if (nova.length < 8 ||
        !RegExp(r'[A-Za-z]').hasMatch(nova) ||
        !RegExp(r'\d').hasMatch(nova)) {
      _snack('Senha deve ter mínimo 8 caracteres com letras e números.',
          erro: true);
      return;
    }

    setState(() => savingPassword = true);
    try {
      await ApiService.patch('/auth/senha',
          data: {'senha_atual': atual, 'nova_senha': nova});
      currentPassword.clear();
      newPassword.clear();
      confirmPassword.clear();
      if (mounted) _snack('Senha alterada com sucesso.', erro: false);
    } catch (e) {
      if (mounted) _snack(ApiService.extractErrorMessage(e), erro: true);
    } finally {
      if (mounted) setState(() => savingPassword = false);
    }
  }

  void _snack(String msg, {required bool erro}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: erro ? LL.live : LL.success,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final navItems = const [
      _ConfigNav(
          'conta', 'Minha Conta', 'Logo, senha e perfil', Icons.person_outline),
      _ConfigNav('plano', 'Meu Plano', 'Assinatura e contrato',
          Icons.credit_card_outlined),
      _ConfigNav('suporte', 'Suporte', 'Fale com a equipe',
          Icons.notifications_none_rounded),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, 0),
          child: LLScreenHeader(
              label: 'Minha Conta',
              italic: 'Configurações',
              subtitle: 'Gerencie sua conta, plano e preferências'),
        ),
        Expanded(
          child: Row(
            children: [
              Container(
                width: 240,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                    border: Border(right: BorderSide(color: context.llBorder))),
                child: Column(children: [
                  for (final item in navItems)
                    _ConfigNavButton(
                        item: item,
                        active: section == item.id,
                        onTap: () => setState(() => section = item.id)),
                ]),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                  child: Align(alignment: Alignment.topLeft, child: _content()),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _content() {
    return switch (section) {
      'plano' => const _PlanoSection(),
      'suporte' => const _SuporteSection(),
      _ => _ContaSection(
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
          showCurrent: showCurrent,
          showNew: showNew,
          showConfirm: showConfirm,
          savingPassword: savingPassword,
          onToggleCurrent: () => setState(() => showCurrent = !showCurrent),
          onToggleNew: () => setState(() => showNew = !showNew),
          onToggleConfirm: () => setState(() => showConfirm = !showConfirm),
          onSavePassword: _onSavePassword,
        ),
    };
  }
}

class _ConfigNavButton extends StatelessWidget {
  const _ConfigNavButton(
      {required this.item, required this.active, required this.onTap});
  final _ConfigNav item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
              color: active ? LL.accentSoft : Colors.transparent,
              borderRadius: BorderRadius.circular(9)),
          child: Stack(children: [
            if (active)
              Positioned(
                  left: -12,
                  top: 3,
                  bottom: 3,
                  child: Container(
                      width: 3,
                      decoration: const BoxDecoration(
                          color: LL.accent,
                          borderRadius: BorderRadius.horizontal(
                              right: Radius.circular(2))))),
            Row(children: [
              Icon(item.icon,
                  size: 16, color: active ? LL.accent : context.llTextMuted),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(item.label,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight:
                                active ? FontWeight.w900 : FontWeight.w700,
                            color: active
                                ? context.llTextPrimary
                                : context.llTextSecond)),
                    const SizedBox(height: 1),
                    Text(item.desc, style: LL.caption.copyWith(fontSize: 10.5)),
                  ])),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _ContaSection extends ConsumerWidget {
  const _ContaSection({
    required this.currentPassword,
    required this.newPassword,
    required this.confirmPassword,
    required this.showCurrent,
    required this.showNew,
    required this.showConfirm,
    required this.savingPassword,
    required this.onToggleCurrent,
    required this.onToggleNew,
    required this.onToggleConfirm,
    required this.onSavePassword,
  });

  final TextEditingController currentPassword;
  final TextEditingController newPassword;
  final TextEditingController confirmPassword;
  final bool showCurrent;
  final bool showNew;
  final bool showConfirm;
  final bool savingPassword;
  final VoidCallback onToggleCurrent;
  final VoidCallback onToggleNew;
  final VoidCallback onToggleConfirm;
  final VoidCallback onSavePassword;

  String _initials(String nome) {
    final parts = nome.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }

  String _papelLabel(String papel) => switch (papel) {
        'cliente_parceiro' => 'Cliente Parceiro',
        'franqueador_master' => 'Franqueador Master',
        'franqueado' => 'Franqueado',
        'gerente' => 'Gerente',
        'apresentador' => 'Apresentador',
        _ => papel,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final nome = user?.nome ?? '—';
    final email = user?.email ?? '—';
    final tenantNome = user?.tenantNome ?? '';
    final papelLabel = _papelLabel(user?.papel ?? '');

    return SizedBox(
      width: 620,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        LLCard(
          padding: const EdgeInsets.all(20),
          borderColor: context.llBorderMid,
          child: Row(children: [
            LLAvatar(initials: _initials(nome), size: 56),
            const SizedBox(width: 16),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(nome,
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          color: context.llTextPrimary,
                          letterSpacing: -0.4),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(
                      tenantNome.isNotEmpty
                          ? '$email · $tenantNome'
                          : email,
                      style: TextStyle(
                          fontSize: 12,
                          color: context.llTextMuted,
                          fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ])),
            LLBadge(
                label: papelLabel,
                color: LL.success,
                background: LL.successSoft),
          ]),
        ),
        const SizedBox(height: 14),
        LLCard(
          padding: const EdgeInsets.all(20),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Alterar Senha',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: context.llTextPrimary)),
            const SizedBox(height: 4),
            Text('Mínimo 8 caracteres com letras e números',
                style: LL.caption.copyWith(fontSize: 11.5)),
            const SizedBox(height: 14),
            _PasswordField(
                controller: currentPassword,
                hint: 'Senha atual',
                visible: showCurrent,
                onToggle: onToggleCurrent),
            const SizedBox(height: 10),
            _PasswordField(
                controller: newPassword,
                hint: 'Nova senha',
                visible: showNew,
                onToggle: onToggleNew),
            const SizedBox(height: 10),
            _PasswordField(
                controller: confirmPassword,
                hint: 'Confirmar nova senha',
                visible: showConfirm,
                onToggle: onToggleConfirm),
            const SizedBox(height: 16),
            Align(
                alignment: Alignment.centerRight,
                child: LLButton(
                    label: savingPassword ? 'Salvando...' : 'Salvar nova senha',
                    onTap: savingPassword ? null : onSavePassword)),
          ]),
        ),
        // W3-A: cliente_parceiro pode adicionar/atualizar o próprio @TikTok.
        // Backend filtra por user_id (sub do JWT), então só edita o próprio cliente.
        if (user?.papel == 'cliente_parceiro') ...[
          const SizedBox(height: 14),
          const _TikTokClienteCard(),
        ],
      ]),
    );
  }
}

/// W3-A: card de configuração do @TikTok do cliente_parceiro.
/// Lê/escreve via [clientePerfilProvider] + [atualizarTiktokUsername].
/// Usa [LLCard] + [LLButton] do design system livelab_v2 pra consistência.
class _TikTokClienteCard extends ConsumerStatefulWidget {
  const _TikTokClienteCard();

  @override
  ConsumerState<_TikTokClienteCard> createState() => _TikTokClienteCardState();
}

class _TikTokClienteCardState extends ConsumerState<_TikTokClienteCard> {
  final _ctrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  bool _hydrated = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final raw = _ctrl.text.trim().replaceAll(RegExp(r'^@'), '');
    setState(() => _saving = true);
    try {
      await atualizarTiktokUsername(ref, raw.isEmpty ? null : raw);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(raw.isEmpty
            ? 'Conta TikTok removida.'
            : '@TikTok atualizada: @$raw'),
        backgroundColor: LL.success,
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ApiService.extractErrorMessage(e)),
        backgroundColor: LL.live,
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final perfilAsync = ref.watch(clientePerfilProvider);

    perfilAsync.whenData((perfil) {
      if (!_hydrated && perfil != null) {
        _ctrl.text = perfil.tiktokUsername ?? '';
        _hydrated = true;
      }
    });

    return LLCard(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.music_note, size: 18, color: context.llTextPrimary),
            const SizedBox(width: 8),
            Text('Conta TikTok',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: context.llTextPrimary)),
          ]),
          const SizedBox(height: 4),
          Text(
              'Adicione o @ da sua loja pra puxarmos métricas das suas lives automaticamente.',
              style: LL.caption.copyWith(fontSize: 11.5)),
          const SizedBox(height: 14),
          TextFormField(
            key: const ValueKey('config_tiktok_field'),
            controller: _ctrl,
            keyboardType: TextInputType.text,
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              hintText: 'lojinha_oficial',
              prefixText: '@ ',
            ),
            validator: FormValidators.tiktokUsername,
            onFieldSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerRight,
            child: LLButton(
              label: _saving ? 'Salvando...' : 'Salvar',
              onTap: _saving ? null : _save,
            ),
          ),
        ]),
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.controller,
    required this.hint,
    required this.visible,
    required this.onToggle,
  });
  final TextEditingController controller;
  final String hint;
  final bool visible;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: !visible,
      decoration: InputDecoration(
        hintText: hint,
        suffixIcon: IconButton(
          onPressed: onToggle,
          icon: Icon(
              visible
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
              size: 18,
              color: context.llTextMuted),
        ),
      ),
    );
  }
}

class _PlanoSection extends StatelessWidget {
  const _PlanoSection();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 620,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        LLCard(
          padding: const EdgeInsets.all(24),
          borderColor: context.llBorderMid,
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('PLANO ATUAL', style: LL.label),
            const SizedBox(height: 8),
            Text.rich(TextSpan(children: [
              TextSpan(
                  text: 'Plano Standard',
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: context.llTextPrimary,
                      letterSpacing: -0.8)),
              TextSpan(
                  text: ' · ativo',
                  style: LL.caption
                      .copyWith(fontSize: 12, fontWeight: FontWeight.w700)),
            ])),
            const SizedBox(height: 8),
            Text(
                'Faça upgrade para destravar mais cabines, prime time e métricas avançadas',
                style: TextStyle(
                    fontSize: 12.5,
                    color: context.llTextSecond,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: LL.accentSoft,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: LL.accent.withValues(alpha: 0.4)),
              ),
              child: Row(children: [
                const Icon(Icons.support_agent_rounded,
                    size: 18, color: LL.accent),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                      'Para fazer upgrade, fale com seu gerente Livelab pelo canal Suporte.',
                      style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: context.llTextPrimary)),
                ),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 14),
        LayoutBuilder(builder: (context, constraints) {
          final compact = constraints.maxWidth < 620;
          // Planos alinhados aos enums do backend (atualizarTenantSchema):
          // Standard / Plus / Premium / Master / Trial.
          // Preços são placeholders comerciais — alterar quando comercial fechar tabela.
          final cards = const [
            _PlanCard(
                name: 'Standard',
                price: 'R\$ 297',
                features: ['1 cabine', '8 lives/mês', 'Métricas básicas'],
                current: true),
            _PlanCard(
                name: 'Plus',
                price: 'R\$ 697',
                features: ['3 cabines', '24 lives/mês', 'Prime time + alertas'],
                highlight: true),
            _PlanCard(name: 'Premium', price: 'R\$ 1.497', features: [
              'Cabines ilimitadas',
              'Lives ilimitadas',
              'Suporte dedicado + ROI assistido'
            ]),
          ];
          if (compact) {
            return Column(children: [
              cards[0],
              const SizedBox(height: 10),
              cards[1],
              const SizedBox(height: 10),
              cards[2]
            ]);
          }
          return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: cards[0]),
            const SizedBox(width: 10),
            Expanded(child: cards[1]),
            const SizedBox(width: 10),
            Expanded(child: cards[2]),
          ]);
        }),
      ]),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard(
      {required this.name,
      required this.price,
      required this.features,
      this.current = false,
      this.highlight = false});
  final String name;
  final String price;
  final List<String> features;
  final bool current;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return LLCard(
      padding: const EdgeInsets.all(16),
      radius: 12,
      borderColor: highlight ? LL.accent.llOpacity(0.55) : context.llBorder,
      child: Stack(children: [
        if (highlight)
          Positioned(
            top: -8,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                  color: LL.accent, borderRadius: BorderRadius.circular(4)),
              child: const Text('RECOMENDADO',
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 0.5)),
            ),
          ),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary)),
          const SizedBox(height: 6),
          Text.rich(TextSpan(children: [
            TextSpan(
                text: price,
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: highlight ? LL.accent : context.llTextPrimary,
                    letterSpacing: -0.6)),
            TextSpan(text: '/mês', style: LL.caption.copyWith(fontSize: 11)),
          ])),
          const SizedBox(height: 12),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(children: [
                Icon(Icons.check_rounded,
                    size: 13, color: highlight ? LL.accent : LL.success),
                const SizedBox(width: 6),
                Expanded(
                    child: Text(f,
                        style: TextStyle(
                            fontSize: 11.5,
                            color: context.llTextSecond,
                            fontWeight: FontWeight.w600))),
              ]),
            ),
          if (current) ...[
            const SizedBox(height: 6),
            const Text('✓ PLANO ATUAL',
                style: TextStyle(
                    fontSize: 11,
                    color: LL.success,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4)),
          ],
        ]),
      ]),
    );
  }
}

class _SuporteSection extends StatelessWidget {
  const _SuporteSection();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 520,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        LLCard(
          padding: const EdgeInsets.all(24),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                      color: const Color(0xFF25D366).llOpacity(0.15),
                      borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.chat_bubble_outline_rounded,
                      size: 20, color: Color(0xFF25D366))),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text('Suporte via WhatsApp',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: context.llTextPrimary)),
                    const SizedBox(height: 2),
                    Text('Resposta em até 30 minutos · seg-sex 9h-19h',
                        style: LL.caption.copyWith(fontSize: 12)),
                  ])),
            ]),
            const SizedBox(height: 16),
            Text(
                'Para suporte, entre em contato com a equipe da unidade. Estamos prontos para ajudar com cabines, agendamentos e dúvidas sobre o painel.',
                style: TextStyle(
                    fontSize: 12.5,
                    color: context.llTextSecond,
                    height: 1.5,
                    fontWeight: FontWeight.w500)),
            const SizedBox(height: 16),
            const LLButton(
                label: 'Abrir WhatsApp',
                icon: Icons.chat_bubble_outline_rounded,
                variant: LLButtonVariant.whatsapp,
                expanded: true),
          ]),
        ),
        const SizedBox(height: 14),
        LLCard(
          padding: const EdgeInsets.all(20),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Outros canais',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: context.llTextPrimary)),
            const SizedBox(height: 12),
            _SupportItem(
                icon: Icons.notifications_none_rounded,
                label: 'Central de ajuda',
                desc: 'Tutoriais e perguntas frequentes'),
            _SupportItem(
                icon: Icons.person_outline,
                label: 'Falar com gerente',
                desc: 'Entre em contato pelo WhatsApp da sua unidade'),
          ]),
        ),
      ]),
    );
  }
}

class _SupportItem extends StatelessWidget {
  const _SupportItem(
      {required this.icon, required this.label, required this.desc});
  final IconData icon;
  final String label;
  final String desc;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
          border: Border(top: BorderSide(color: context.llBorder))),
      child: Row(children: [
        Icon(icon, size: 16, color: context.llTextMuted),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary)),
          const SizedBox(height: 1),
          Text(desc, style: LL.caption.copyWith(fontSize: 11)),
        ])),
        Icon(Icons.chevron_right_rounded, size: 16, color: context.llTextMuted),
      ]),
    );
  }
}

class _ConfigNav {
  const _ConfigNav(this.id, this.label, this.desc, this.icon);
  final String id;
  final String label;
  final String desc;
  final IconData icon;
}
