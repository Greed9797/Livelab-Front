import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../models/usuario.dart';
import '../../models/apresentadora.dart';
import '../../models/cliente.dart';
import '../apresentadoras/apresentadoras_screen.dart';
import '../../providers/usuarios_provider.dart';
import '../../providers/apresentadoras_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../providers/convites_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/temp_password_dialog.dart';
import '../../livelab/core/responsive.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../livelab/theme/tokens.dart';
import '../../livelab/widgets/livelab_scaffold.dart';
import 'criar_usuario_dialog.dart';

class UsuariosScreen extends ConsumerStatefulWidget {
  const UsuariosScreen({super.key});

  @override
  ConsumerState<UsuariosScreen> createState() => _UsuariosScreenState();
}

class _UsuariosScreenState extends ConsumerState<UsuariosScreen> {
  int _tab = 0; // 0 internos, 1 convites pendentes
  String _search = '';
  // Seleção múltipla para reenvio em bulk
  final Set<String> _selecionados = {};

  static const _papeisInternos = [
    'gerente',
    'gerente_comercial',
    'financeiro',
    'operacional',
  ];

  void _refresh() {
    ref.read(usuariosProvider.notifier).refresh();
    ref.read(apresentadorasProvider.notifier).refresh();
    ref.read(clientesProvider.notifier).refresh();
    ref.read(convitesProvider.notifier).refresh();
  }

  Future<void> _openNovoUsuario() async {
    await showDialog<void>(
      context: context,
      builder: (_) => const CriarUsuarioDialog(),
    );
  }

  String get _novoLabel => 'Novo usuário';

  @override
  Widget build(BuildContext context) {
    return LivelabScaffold(
      currentRoute: AppRoutes.usuarios,
      onRefresh: _refresh,
      child: _content(),
    );
  }

  Widget _content() {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final pad = r.isMobile ? 16.0 : 28.0;

    final usuariosAsync = ref.watch(usuariosProvider);
    final convitesAsync = ref.watch(convitesProvider);
    final apresentadorasAsync = ref.watch(apresentadorasProvider);

    final internos = (usuariosAsync.valueOrNull ?? const <Usuario>[])
        .where((u) => _papeisInternos.contains(u.papel))
        .toList();
    final convites = convitesAsync.valueOrNull ?? const <ConvitePendente>[];
    final apresentadoras = apresentadorasAsync.valueOrNull ?? const <Apresentadora>[];

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(pad, 16, pad, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _pageHeader(t),
          const SizedBox(height: 18),
          _toolbar(t),
          const SizedBox(height: 16),
          _tabStrip(t,
              internosCount: internos.length,
              convitesCount: convites.length,
              apresentadorasCount: apresentadoras.length),
          const SizedBox(height: 16),
          if (_tab == 0) _internosBody(t, usuariosAsync, internos),
          if (_tab == 1) _convitesBody(t, convitesAsync, convites),
          if (_tab == 2) const ApresentadorasScreen(embedded: true),
        ],
      ),
    );
  }

  Widget _pageHeader(LlTokens t) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '— ACESSOS E PESSOAS',
                style: TextStyle(
                  color: t.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: 'Gestão da ',
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.9,
                      ),
                    ),
                    TextSpan(
                      text: 'Equipe',
                      style: GoogleFonts.instrumentSerif(
                        color: t.primary,
                        fontStyle: FontStyle.italic,
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Internos, apresentadores e clientes-parceiros da unidade.',
                style: TextStyle(color: t.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
        Material(
          color: t.bgElev1,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _refresh,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border.all(color: t.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.refresh, size: 14, color: t.textSecondary),
                  const SizedBox(width: 6),
                  Text('Atualizar',
                      style: TextStyle(
                          color: t.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _toolbar(LlTokens t) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: t.bgElev1,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: t.border),
            ),
            child: Row(
              children: [
                Icon(Icons.search, size: 16, color: t.textMuted),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    onChanged: (v) => setState(() => _search = v),
                    style: TextStyle(color: t.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Buscar por nome ou e-mail…',
                      hintStyle: TextStyle(color: t.textMuted, fontSize: 13),
                      border: InputBorder.none,
                      contentPadding:
                          const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        Material(
          color: t.primary,
          borderRadius: BorderRadius.circular(12),
          elevation: 2,
          shadowColor: t.primary.withValues(alpha: 0.4),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _openNovoUsuario,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.add, size: 16, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(
                    _novoLabel,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _tabStrip(
    LlTokens t, {
    required int internosCount,
    required int convitesCount,
    required int apresentadorasCount,
  }) {
    final tabs = [
      (Icons.people_outline, 'Usuários ativos', internosCount),
      (Icons.mail_outline_rounded, 'Convites pendentes', convitesCount),
      (Icons.videocam_outlined, 'Apresentadoras', apresentadorasCount),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(tabs.length, (i) {
        final active = _tab == i;
        return Material(
          color: active ? t.primarySoft : t.bgElev1,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => setState(() => _tab = i),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border.all(color: active ? t.primary : t.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(tabs[i].$1,
                      size: 16,
                      color: active ? t.primary : t.textSecondary),
                  const SizedBox(width: 8),
                  Text(
                    tabs[i].$2,
                    style: TextStyle(
                      color: active ? t.primary : t.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: active ? t.primary : t.bgElev2,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                          color: active ? t.primary : t.border),
                    ),
                    child: Text(
                      '${tabs[i].$3}',
                      style: TextStyle(
                        color: active ? Colors.white : t.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  bool _matchesSearch(String name, String? email) {
    if (_search.trim().isEmpty) return true;
    final q = _search.trim().toLowerCase();
    return name.toLowerCase().contains(q) ||
        (email?.toLowerCase().contains(q) ?? false);
  }

  Widget _internosBody(
      LlTokens t, AsyncValue async, List<Usuario> internos) {
    return async.when(
      loading: () => const _LoadingBox(),
      error: (e, _) => _errorBox(t, e),
      data: (_) {
        final filtered =
            internos.where((u) => _matchesSearch(u.nome, u.email)).toList();
        if (filtered.isEmpty) {
          return _emptyBox(t,
              icon: Icons.group_outlined,
              title: 'Nenhum usuário interno',
              sub: 'Convide alguém da sua equipe para começar.');
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: filtered
              .map((u) => _InternoRow(t: t, u: u, ref: ref))
              .toList(),
        );
      },
    );
  }


  // ─── Convites pendentes ────────────────────────────────────────────────────

  Widget _convitesBody(
      LlTokens t, AsyncValue<List<ConvitePendente>> async, List<ConvitePendente> convites) {
    return async.when(
      loading: () => const _LoadingBox(),
      error: (e, _) => _errorBox(t, e),
      data: (_) {
        final filtered = convites
            .where((c) => _matchesSearch(c.nome, c.email))
            .toList();
        if (filtered.isEmpty) {
          return _emptyBox(t,
              icon: Icons.mail_outlined,
              title: 'Nenhum convite pendente',
              sub: 'Todos os usuários convidados já aceitaram.');
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Toolbar de seleção bulk
            if (_selecionados.isNotEmpty) _bulkToolbar(t),
            if (_selecionados.isNotEmpty) const SizedBox(height: 10),
            ...filtered.map((c) => _ConviteRow(
                  t: t,
                  convite: c,
                  selecionado: _selecionados.contains(c.id),
                  onToggle: () => setState(() {
                    if (_selecionados.contains(c.id)) {
                      _selecionados.remove(c.id);
                    } else {
                      _selecionados.add(c.id);
                    }
                  }),
                  onCancelar: () => _cancelarConvite(t, c),
                )),
          ],
        );
      },
    );
  }

  Widget _bulkToolbar(LlTokens t) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: t.primarySoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: t.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Text(
            '${_selecionados.length} selecionado${_selecionados.length > 1 ? 's' : ''}',
            style: TextStyle(
                color: t.primary, fontSize: 13, fontWeight: FontWeight.w700),
          ),
          const Spacer(),
          TextButton(
            onPressed: () => setState(() => _selecionados.clear()),
            child: Text('Limpar', style: TextStyle(color: t.textSecondary, fontSize: 13)),
          ),
          const SizedBox(width: 8),
          Material(
            color: t.primary,
            borderRadius: BorderRadius.circular(10),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => _reenviarBulk(t),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.send_rounded, size: 14, color: Colors.white),
                    const SizedBox(width: 6),
                    Text(
                      'Reenviar selecionados',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _reenviarBulk(LlTokens t) async {
    final ids = _selecionados.toList();
    try {
      final result = await ref
          .read(convitesProvider.notifier)
          .reenviarBulk(ids);
      if (!mounted) return;
      final n = result['reenviados'] as int? ?? 0;
      final falhas = (result['falhas'] as List?)?.length ?? 0;
      final msg = falhas > 0
          ? '$n convite(s) reenviado(s). $falhas falha(s).'
          : '$n convite(s) reenviado(s) com sucesso.';
      setState(() => _selecionados.clear());
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: falhas > 0 ? t.warning : t.success,
        content: Text(msg),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: Text(ApiService.extractErrorMessage(e)),
      ));
    }
  }

  Future<void> _cancelarConvite(LlTokens t, ConvitePendente c) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancelar convite'),
        content: Text('Deseja cancelar o convite de ${c.nome}? O usuário será removido permanentemente.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Não'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Cancelar convite',
                style: TextStyle(color: t.danger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(convitesProvider.notifier).cancelar(c.id);
      if (!mounted) return;
      setState(() => _selecionados.remove(c.id));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.success,
        content: Text('Convite de ${c.nome} cancelado.'),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: Text(ApiService.extractErrorMessage(e)),
      ));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Linhas
// ─────────────────────────────────────────────────────────────────────────────

const _papelLabels = {
  'gerente': 'Gerente',
  'gerente_comercial': 'Ger. Comercial',
  'financeiro': 'Financeiro',
  'operacional': 'Operacional',
  'apresentador': 'Apresentadora',
  'apresentadora': 'Apresentadora',
  'cliente_parceiro': 'Cliente',
  'franqueado': 'Franqueado',
  'franqueador_master': 'Master',
};

Widget _avatar(LlTokens t, String letter, {required Color bg, required Color fg}) {
  return Container(
    width: 40,
    height: 40,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      letter.isNotEmpty ? letter[0].toUpperCase() : '?',
      style: TextStyle(
        color: fg,
        fontSize: 15,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
    ),
  );
}

Widget _statusPill(LlTokens t, {required String label, required Color color}) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.13),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
      ],
    ),
  );
}

Widget _rowShell(LlTokens t, {required Widget child}) {
  return Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(
      color: t.bgElev1,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: t.border),
      boxShadow: t.shadowCard,
    ),
    child: child,
  );
}

class _InternoRow extends StatelessWidget {
  final LlTokens t;
  final Usuario u;
  final WidgetRef ref;
  const _InternoRow({required this.t, required this.u, required this.ref});

  @override
  Widget build(BuildContext context) {
    final r = LlResponsive.of(context);
    final stack = r.isMobile;
    final ativo = u.ativo;

    final left = Row(
      children: [
        _avatar(t, u.nome, bg: t.primarySoft, fg: t.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(u.nome,
                  style: TextStyle(
                      color: t.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(u.email,
                  style: TextStyle(color: t.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ],
    );

    final right = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: t.bgElev2,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: t.border),
          ),
          child: Text(
            _papelLabels[u.papel] ?? u.papel,
            style: TextStyle(
              color: t.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 8),
        _statusPill(
          t,
          label: ativo ? 'Ativo' : 'Inativo',
          color: ativo ? t.success : t.danger,
        ),
        const SizedBox(width: 4),
        _MoreMenuInterno(t: t, u: u, ref: ref),
      ],
    );

    return _rowShell(t,
        child: stack
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  left,
                  const SizedBox(height: 10),
                  Align(alignment: Alignment.centerRight, child: right),
                ],
              )
            : Row(children: [
                Expanded(child: left),
                const SizedBox(width: 12),
                right,
              ]));
  }
}

class _MoreMenuInterno extends StatelessWidget {
  final LlTokens t;
  final Usuario u;
  final WidgetRef ref;
  const _MoreMenuInterno(
      {required this.t, required this.u, required this.ref});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: t.textMuted, size: 20),
      color: t.bgElev1,
      onSelected: (v) async {
        try {
          if (v == 'editar') {
            await showDialog<void>(
              context: context,
              builder: (_) => _InternoFormDialog(usuario: u),
            );
          } else if (v == 'reset') {
            final senha = await ref
                .read(usuariosProvider.notifier)
                .resetSenha(u.id);
            if (!context.mounted) return;
            await TempPasswordDialog.show(
              context,
              nome: u.nome,
              email: u.email,
              senhaTemporaria: senha,
            );
          } else if (v == 'toggle') {
            final novoAtivo = !u.ativo;
            await ref
                .read(usuariosProvider.notifier)
                .atualizar(u.id, {'ativo': novoAtivo});
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor: novoAtivo ? t.success : t.warning,
              content: Text(novoAtivo
                  ? 'Usuário reativado'
                  : 'Usuário desativado'),
            ));
          } else if (v == 'reenviar') {
            await ref
                .read(usuariosProvider.notifier)
                .reenviarConvite(u.id);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor: t.info,
              content: const Text('Convite reenviado. Validade 72h.'),
            ));
          } else if (v == 'force-logout') {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('Forçar logout'),
                content: Text(
                  'Isso invalida TODAS as sessões ativas de ${u.nome}. Continuar?',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Cancelar'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Confirmar', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ),
            );
            if (confirm != true) return;
            await ref
                .read(usuariosProvider.notifier)
                .forceLogout(u.id);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor: t.warning,
              content: const Text('Sessões invalidadas'),
            ));
          }
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            backgroundColor: t.danger,
            content: Text(ApiService.extractErrorMessage(e)),
          ));
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'editar',
          child: Row(children: [
            Icon(Icons.edit_outlined, size: 16, color: t.textPrimary),
            const SizedBox(width: 8),
            Text('Editar',
                style: TextStyle(color: t.textPrimary, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'reset',
          child: Row(children: [
            Icon(Icons.lock_reset, size: 16, color: t.textPrimary),
            const SizedBox(width: 8),
            Text('Resetar senha',
                style: TextStyle(color: t.textPrimary, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'toggle',
          child: Row(children: [
            Icon(u.ativo ? Icons.person_off : Icons.person,
                size: 16,
                color: u.ativo ? t.danger : t.success),
            const SizedBox(width: 8),
            Text(u.ativo ? 'Desativar' : 'Reativar',
                style: TextStyle(
                    color: u.ativo ? t.danger : t.success,
                    fontSize: 13,
                    fontWeight: FontWeight.w600)),
          ]),
        ),
        PopupMenuItem(
          value: 'reenviar',
          child: Row(children: [
            Icon(Icons.mail_outline, size: 16, color: t.textPrimary),
            const SizedBox(width: 8),
            Text('Reenviar convite',
                style: TextStyle(color: t.textPrimary, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'force-logout',
          child: Row(children: [
            Icon(Icons.logout, size: 16, color: t.danger),
            const SizedBox(width: 8),
            Text('Forçar logout',
                style: TextStyle(color: t.danger, fontSize: 13)),
          ]),
        ),
      ],
    );
  }
}

class _InternoFormDialog extends ConsumerStatefulWidget {
  final Usuario usuario;
  const _InternoFormDialog({required this.usuario});

  @override
  ConsumerState<_InternoFormDialog> createState() =>
      _InternoFormDialogState();
}

class _InternoFormDialogState extends ConsumerState<_InternoFormDialog> {
  late final TextEditingController _nome;
  late final TextEditingController _email;
  late String _papel;
  bool _saving = false;

  static const _papeis = [
    ('gerente', 'Gerente'),
    ('gerente_comercial', 'Gerente Comercial'),
    ('financeiro', 'Financeiro'),
    ('operacional', 'Operacional'),
  ];

  @override
  void initState() {
    super.initState();
    _nome = TextEditingController(text: widget.usuario.nome);
    _email = TextEditingController(text: widget.usuario.email);
    _papel = _papeis.any((p) => p.$1 == widget.usuario.papel)
        ? widget.usuario.papel
        : _papeis.first.$1;
  }

  @override
  void dispose() {
    _nome.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final nome = _nome.text.trim();
    final email = _email.text.trim();
    final t = context.llTokens;
    if (nome.isEmpty || email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: const Text('Nome e email são obrigatórios.'),
      ));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(usuariosProvider.notifier).atualizar(
        widget.usuario.id,
        {'nome': nome, 'email': email, 'papel': _papel},
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.success,
        content: const Text('Usuário atualizado'),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: Text(ApiService.extractErrorMessage(e)),
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Dialog(
      backgroundColor: t.bgElev1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  Icon(Icons.edit_outlined, size: 20, color: t.textPrimary),
                  const SizedBox(width: 10),
                  Text('Editar interno',
                      style: TextStyle(
                          color: t.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700)),
                ]),
                const SizedBox(height: 16),
                TextField(
                  controller: _nome,
                  decoration: const InputDecoration(labelText: 'Nome'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _papel,
                  decoration: const InputDecoration(labelText: 'Papel'),
                  items: [
                    for (final p in _papeis)
                      DropdownMenuItem(value: p.$1, child: Text(p.$2)),
                  ],
                  onChanged: (v) =>
                      setState(() => _papel = v ?? _papeis.first.$1),
                ),
                const SizedBox(height: 18),
                Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: _saving
                            ? null
                            : () => Navigator.of(context).pop(),
                        child: const Text('Cancelar'),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _saving ? null : _salvar,
                        child: Text(_saving ? 'Salvando...' : 'Salvar'),
                      ),
                    ]),
              ]),
        ),
      ),
    );
  }
}

class _ApresentadoraRow extends ConsumerWidget {
  final LlTokens t;
  final Apresentadora a;
  const _ApresentadoraRow({required this.t, required this.a});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = LlResponsive.of(context);
    final stack = r.isMobile;
    final fmtBrl =
        NumberFormat.compactSimpleCurrency(locale: 'pt_BR', decimalDigits: 1);
    final purpleBg = const Color(0xFFAF7BFF).withValues(alpha: 0.16);
    const purpleFg = Color(0xFFAF7BFF);

    final left = Row(
      children: [
        _avatar(t, a.nome, bg: purpleBg, fg: purpleFg),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(a.nome,
                  style: TextStyle(
                      color: t.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(a.email ?? a.cargo ?? 'Apresentadora',
                  style: TextStyle(color: t.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ],
    );

    final stats = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _stat(t,
            value: '${a.totalLives}',
            label: 'lives',
            color: t.textPrimary),
        const SizedBox(width: 18),
        _stat(t,
            value: a.totalFaturamento >= 1000
                ? fmtBrl.format(a.totalFaturamento)
                : 'R\$ ${a.totalFaturamento.toStringAsFixed(0)}',
            label: 'GMV',
            color: t.primary),
      ],
    );

    final status = _statusPill(
      t,
      label: a.ativo ? 'Ativo' : 'Pausado',
      color: a.ativo ? t.success : t.warning,
    );

    return _rowShell(t,
        child: stack
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  left,
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [stats, status],
                  ),
                ],
              )
            : Row(
                children: [
                  Expanded(child: left),
                  stats,
                  const SizedBox(width: 18),
                  status,
                  const SizedBox(width: 4),
                  _ApresentadoraMenu(t: t, a: a, ref: ref),
                ],
              ));
  }

  Widget _stat(LlTokens t,
      {required String value, required String label, required Color color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(value,
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              fontFeatures: const [FontFeature.tabularFigures()],
            )),
        Text(label,
            style: TextStyle(color: t.textMuted, fontSize: 10.5)),
      ],
    );
  }
}

class _ClienteRow extends ConsumerWidget {
  final LlTokens t;
  final Cliente c;
  const _ClienteRow({required this.t, required this.c});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _rowShell(t,
        child: Row(
          children: [
            _avatar(t, c.nome, bg: t.primarySoft, fg: t.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.nome,
                      style: TextStyle(
                          color: t.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(c.email ?? (c.nicho ?? 'Cliente'),
                      style: TextStyle(color: t.textMuted, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: t.bgElev2,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: t.border),
              ),
              child: Text(
                (c.nicho?.isNotEmpty ?? false) ? c.nicho! : 'Cliente',
                style: TextStyle(
                  color: t.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 4),
            _ClienteMenu(t: t, c: c, ref: ref),
          ],
        ));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kebab menus + form dialogs (Apresentadora & Cliente)
// ─────────────────────────────────────────────────────────────────────────────

class _ApresentadoraMenu extends StatelessWidget {
  final LlTokens t;
  final Apresentadora a;
  final WidgetRef ref;
  const _ApresentadoraMenu(
      {required this.t, required this.a, required this.ref});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: t.textMuted, size: 20),
      color: t.bgElev1,
      onSelected: (v) async {
        try {
          if (v == 'editar') {
            await showDialog<void>(
              context: context,
              builder: (_) => _ApresentadoraFormDialog(item: a),
            );
          } else if (v == 'toggle') {
            await ref.read(apresentadorasProvider.notifier).salvar(
              {'ativo': !a.ativo},
              id: a.id,
            );
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor: a.ativo ? t.warning : t.success,
              content: Text(a.ativo
                  ? 'Apresentadora pausada'
                  : 'Apresentadora reativada'),
            ));
          } else if (v == 'excluir') {
            final ok = await _confirmDialog(context, t,
                titulo: 'Excluir apresentadora',
                msg:
                    'Esta ação remove ${a.nome} permanentemente. Deseja continuar?');
            if (ok != true) return;
            await ref.read(apresentadorasProvider.notifier).deletar(a.id);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor: t.success,
              content: const Text('Apresentadora excluída'),
            ));
          }
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            backgroundColor: t.danger,
            content: Text(ApiService.extractErrorMessage(e)),
          ));
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'editar',
          child: Row(children: [
            Icon(Icons.edit_outlined, size: 16, color: t.textPrimary),
            const SizedBox(width: 8),
            Text('Editar',
                style: TextStyle(color: t.textPrimary, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'toggle',
          child: Row(children: [
            Icon(a.ativo ? Icons.pause_circle_outline : Icons.play_circle_outline,
                size: 16,
                color: a.ativo ? t.warning : t.success),
            const SizedBox(width: 8),
            Text(a.ativo ? 'Pausar' : 'Reativar',
                style: TextStyle(
                    color: a.ativo ? t.warning : t.success, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'excluir',
          child: Row(children: [
            Icon(Icons.delete_outline, size: 16, color: t.danger),
            const SizedBox(width: 8),
            Text('Excluir',
                style: TextStyle(color: t.danger, fontSize: 13)),
          ]),
        ),
      ],
    );
  }
}

class _ClienteMenu extends StatelessWidget {
  final LlTokens t;
  final Cliente c;
  final WidgetRef ref;
  const _ClienteMenu({required this.t, required this.c, required this.ref});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: t.textMuted, size: 20),
      color: t.bgElev1,
      onSelected: (v) async {
        try {
          if (v == 'editar') {
            await showDialog<void>(
              context: context,
              builder: (_) => _ClienteFormDialog(item: c),
            );
          } else if (v == 'toggle') {
            final novoStatus = c.status == 'ativo' ? 'inativo' : 'ativo';
            await ref
                .read(clientesProvider.notifier)
                .atualizar(c.id, {'status': novoStatus});
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              backgroundColor:
                  novoStatus == 'ativo' ? t.success : t.warning,
              content: Text(novoStatus == 'ativo'
                  ? 'Cliente reativado'
                  : 'Cliente desativado'),
            ));
          }
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            backgroundColor: t.danger,
            content: Text(ApiService.extractErrorMessage(e)),
          ));
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'editar',
          child: Row(children: [
            Icon(Icons.edit_outlined, size: 16, color: t.textPrimary),
            const SizedBox(width: 8),
            Text('Editar',
                style: TextStyle(color: t.textPrimary, fontSize: 13)),
          ]),
        ),
        PopupMenuItem(
          value: 'toggle',
          child: Row(children: [
            Icon(
              c.status == 'ativo'
                  ? Icons.person_off
                  : Icons.person,
              size: 16,
              color: c.status == 'ativo' ? t.warning : t.success,
            ),
            const SizedBox(width: 8),
            Text(
              c.status == 'ativo' ? 'Desativar' : 'Reativar',
              style: TextStyle(
                  color: c.status == 'ativo' ? t.warning : t.success,
                  fontSize: 13),
            ),
          ]),
        ),
      ],
    );
  }
}

Future<bool?> _confirmDialog(BuildContext context, LlTokens t,
    {required String titulo, required String msg}) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: t.bgElev1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(titulo,
          style: TextStyle(
              color: t.textPrimary, fontWeight: FontWeight.w700)),
      content: Text(msg, style: TextStyle(color: t.textSecondary)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: Text('Cancelar', style: TextStyle(color: t.textSecondary)),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: t.danger),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Confirmar'),
        ),
      ],
    ),
  );
}

// ── Apresentadora Form ──────────────────────────────────────────────────────

class _ApresentadoraFormDialog extends ConsumerStatefulWidget {
  final Apresentadora? item;
  const _ApresentadoraFormDialog({this.item});

  @override
  ConsumerState<_ApresentadoraFormDialog> createState() =>
      _ApresentadoraFormDialogState();
}

class _ApresentadoraFormDialogState
    extends ConsumerState<_ApresentadoraFormDialog> {
  late final TextEditingController _nome;
  late final TextEditingController _email;
  late final TextEditingController _telefone;
  late final TextEditingController _cargo;
  late final TextEditingController _fixo;
  late final TextEditingController _comissao;
  late final TextEditingController _meta;
  late bool _ativo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final i = widget.item;
    _nome = TextEditingController(text: i?.nome ?? '');
    _email = TextEditingController(text: i?.email ?? '');
    _telefone = TextEditingController(text: i?.telefone ?? '');
    _cargo = TextEditingController(text: i?.cargo ?? '');
    _fixo = TextEditingController(
        text: i == null ? '' : i.fixo.toStringAsFixed(2));
    _comissao = TextEditingController(
        text: i == null ? '' : i.comissaoPct.toStringAsFixed(2));
    _meta = TextEditingController(
        text: i == null ? '' : i.metaDiariaGmv.toStringAsFixed(2));
    _ativo = i?.ativo ?? true;
  }

  @override
  void dispose() {
    _nome.dispose();
    _email.dispose();
    _telefone.dispose();
    _cargo.dispose();
    _fixo.dispose();
    _comissao.dispose();
    _meta.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final t = context.llTokens;
    if (_nome.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: const Text('Nome é obrigatório'),
      ));
      return;
    }
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'nome': _nome.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
        if (_telefone.text.trim().isNotEmpty) 'telefone': _telefone.text.trim(),
        if (_cargo.text.trim().isNotEmpty) 'cargo': _cargo.text.trim(),
        'fixo': double.tryParse(_fixo.text.replaceAll(',', '.')) ?? 0,
        'comissao_pct':
            double.tryParse(_comissao.text.replaceAll(',', '.')) ?? 0,
        'meta_diaria_gmv':
            double.tryParse(_meta.text.replaceAll(',', '.')) ?? 0,
        'ativo': _ativo,
      };
      await ref
          .read(apresentadorasProvider.notifier)
          .salvar(data, id: widget.item?.id);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.success,
          content: Text(widget.item == null
              ? 'Apresentadora cadastrada'
              : 'Apresentadora atualizada'),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.danger,
          content: Text(ApiService.extractErrorMessage(e)),
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return AlertDialog(
      backgroundColor: t.bgElev1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(Icons.mic_none_rounded, color: t.primary, size: 20),
          const SizedBox(width: 10),
          Text(
            widget.item == null ? 'Nova apresentadora' : 'Editar apresentadora',
            style: TextStyle(
                color: t.textPrimary, fontWeight: FontWeight.w700),
          ),
        ],
      ),
      content: SizedBox(
        width: 460,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _formField(t, 'Nome *', _nome),
              const SizedBox(height: 10),
              _formField(t, 'E-mail', _email,
                  keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 10),
              _formField(t, 'Telefone', _telefone,
                  keyboardType: TextInputType.phone),
              const SizedBox(height: 10),
              _formField(t, 'Cargo', _cargo),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _formField(t, 'Fixo (R\$)', _fixo,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true))),
                  const SizedBox(width: 10),
                  Expanded(child: _formField(t, 'Comissão %', _comissao,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true))),
                ],
              ),
              const SizedBox(height: 10),
              _formField(t, 'Meta diária GMV (R\$)', _meta,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true)),
              const SizedBox(height: 12),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: _ativo,
                activeThumbColor: t.primary,
                onChanged: (v) => setState(() => _ativo = v),
                title: Text('Apresentadora ativa',
                    style: TextStyle(color: t.textPrimary, fontSize: 13)),
                subtitle: Text(
                    _ativo
                        ? 'Disponível para agendamentos'
                        : 'Pausada — sem novas lives',
                    style: TextStyle(color: t.textMuted, fontSize: 11)),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: t.textSecondary)),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: t.primary),
          onPressed: _saving ? null : _salvar,
          child: _saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : Text(widget.item == null ? 'Cadastrar' : 'Salvar'),
        ),
      ],
    );
  }
}

// ── Cliente Form ────────────────────────────────────────────────────────────

class _ClienteFormDialog extends ConsumerStatefulWidget {
  final Cliente? item;
  const _ClienteFormDialog({this.item});

  @override
  ConsumerState<_ClienteFormDialog> createState() =>
      _ClienteFormDialogState();
}

class _ClienteFormDialogState extends ConsumerState<_ClienteFormDialog> {
  late final TextEditingController _nome;
  late final TextEditingController _celular;
  late final TextEditingController _email;
  late final TextEditingController _nicho;
  late final TextEditingController _cidade;
  late final TextEditingController _estado;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final c = widget.item;
    _nome = TextEditingController(text: c?.nome ?? '');
    _celular = TextEditingController(text: c?.celular ?? '');
    _email = TextEditingController(text: c?.email ?? '');
    _nicho = TextEditingController(text: c?.nicho ?? '');
    _cidade = TextEditingController(text: c?.cidade ?? '');
    _estado = TextEditingController(text: c?.estado ?? '');
  }

  @override
  void dispose() {
    _nome.dispose();
    _celular.dispose();
    _email.dispose();
    _nicho.dispose();
    _cidade.dispose();
    _estado.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final t = context.llTokens;
    if (_nome.text.trim().isEmpty || _celular.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        backgroundColor: t.danger,
        content: const Text('Nome e celular são obrigatórios'),
      ));
      return;
    }
    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'nome': _nome.text.trim(),
        'celular': _celular.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
        if (_nicho.text.trim().isNotEmpty) 'nicho': _nicho.text.trim(),
        if (_cidade.text.trim().isNotEmpty) 'cidade': _cidade.text.trim(),
        if (_estado.text.trim().isNotEmpty) 'estado': _estado.text.trim(),
      };
      if (widget.item == null) {
        await ref.read(clientesProvider.notifier).criar(data);
      } else {
        await ref
            .read(clientesProvider.notifier)
            .atualizar(widget.item!.id, data);
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.success,
          content: Text(widget.item == null
              ? 'Cliente cadastrado'
              : 'Cliente atualizado'),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: t.danger,
          content: Text(ApiService.extractErrorMessage(e)),
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return AlertDialog(
      backgroundColor: t.bgElev1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Icon(Icons.shopping_bag_outlined, color: t.primary, size: 20),
          const SizedBox(width: 10),
          Text(
            widget.item == null ? 'Novo cliente' : 'Editar cliente',
            style: TextStyle(
                color: t.textPrimary, fontWeight: FontWeight.w700),
          ),
        ],
      ),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _formField(t, 'Nome *', _nome),
              const SizedBox(height: 10),
              _formField(t, 'Celular *', _celular,
                  keyboardType: TextInputType.phone),
              const SizedBox(height: 10),
              _formField(t, 'E-mail', _email,
                  keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 10),
              _formField(t, 'Nicho', _nicho),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _formField(t, 'Cidade', _cidade)),
                  const SizedBox(width: 10),
                  SizedBox(
                      width: 90, child: _formField(t, 'UF', _estado)),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: t.textSecondary)),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: t.primary),
          onPressed: _saving ? null : _salvar,
          child: _saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : Text(widget.item == null ? 'Cadastrar' : 'Salvar'),
        ),
      ],
    );
  }
}

Widget _formField(LlTokens t, String label, TextEditingController c,
    {TextInputType? keyboardType}) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(
          label,
          style: TextStyle(
            color: t.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
      ),
      TextField(
        controller: c,
        keyboardType: keyboardType,
        style: TextStyle(color: t.textPrimary, fontSize: 13),
        decoration: InputDecoration(
          isDense: true,
          filled: true,
          fillColor: t.bgElev2,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: t.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: t.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: t.primary),
          ),
        ),
      ),
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

Widget _emptyBox(LlTokens t,
    {required IconData icon, required String title, required String sub}) {
  return Container(
    padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
    decoration: BoxDecoration(
      color: t.bgElev1,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: t.border),
    ),
    child: Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: t.primarySoft,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: t.primary, size: 26),
        ),
        const SizedBox(height: 14),
        Text(title,
            style: TextStyle(
              color: t.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            )),
        const SizedBox(height: 4),
        Text(sub,
            textAlign: TextAlign.center,
            style: TextStyle(color: t.textMuted, fontSize: 12)),
      ],
    ),
  );
}

Widget _errorBox(LlTokens t, Object e) {
  return Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: t.dangerSoft,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: t.danger.withValues(alpha: 0.3)),
    ),
    child: Row(
      children: [
        Icon(Icons.error_outline, color: t.danger),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            ApiService.extractErrorMessage(e),
            style: TextStyle(color: t.danger, fontSize: 13),
          ),
        ),
      ],
    ),
  );
}

class _LoadingBox extends StatelessWidget {
  const _LoadingBox();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 60),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ConviteRow — linha de convite pendente com badge de status e ações
// ─────────────────────────────────────────────────────────────────────────────

class _ConviteRow extends StatelessWidget {
  final LlTokens t;
  final ConvitePendente convite;
  final bool selecionado;
  final VoidCallback onToggle;
  final VoidCallback onCancelar;

  const _ConviteRow({
    required this.t,
    required this.convite,
    required this.selecionado,
    required this.onToggle,
    required this.onCancelar,
  });

  @override
  Widget build(BuildContext context) {
    final expirou = convite.expirou;
    final dias = convite.diasRestantes;
    final badgeColor = expirou ? t.danger : (dias != null && dias <= 1 ? t.warning : t.info);
    final badgeLabel = expirou
        ? 'EXPIRADO'
        : dias == null
            ? 'SEM PRAZO'
            : dias == 0
                ? 'EXPIRA HOJE'
                : 'EXPIRA EM ${dias}d';

    final papelLabel = _papelLabels[convite.papel] ?? convite.papel;

    return _rowShell(
      t,
      child: Row(
        children: [
          // Checkbox seleção
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: selecionado ? t.primary : Colors.transparent,
                border: Border.all(
                    color: selecionado ? t.primary : t.border, width: 2),
                borderRadius: BorderRadius.circular(5),
              ),
              child: selecionado
                  ? const Icon(Icons.check, size: 13, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          // Avatar
          _avatar(t, convite.nome,
              bg: expirou
                  ? t.danger.withValues(alpha: 0.12)
                  : t.info.withValues(alpha: 0.12),
              fg: expirou ? t.danger : t.info),
          const SizedBox(width: 12),
          // Nome + email + papel
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  convite.nome,
                  style: TextStyle(
                      color: t.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  convite.email,
                  style: TextStyle(color: t.textSecondary, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  papelLabel,
                  style: TextStyle(
                      color: t.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Badge de status expiração
          _statusPill(t, label: badgeLabel, color: badgeColor),
          const SizedBox(width: 10),
          // Menu de ações
          PopupMenuButton<String>(
            icon: Icon(Icons.more_vert, color: t.textMuted, size: 20),
            color: t.bgElev1,
            onSelected: (v) async {
              if (v == 'reenviar') {
                try {
                  await ApiService.post(
                    '/usuarios/${convite.id}/reenviar-convite',
                    data: {},
                  );
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    backgroundColor: t.info,
                    content: const Text('Convite reenviado. Validade 72h.'),
                  ));
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    backgroundColor: t.danger,
                    content: Text(ApiService.extractErrorMessage(e)),
                  ));
                }
              } else if (v == 'cancelar') {
                onCancelar();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'reenviar',
                child: Row(children: [
                  Icon(Icons.send_rounded, size: 16, color: t.info),
                  const SizedBox(width: 8),
                  Text('Reenviar convite',
                      style: TextStyle(color: t.textPrimary, fontSize: 13)),
                ]),
              ),
              PopupMenuItem(
                value: 'cancelar',
                child: Row(children: [
                  Icon(Icons.cancel_outlined, size: 16, color: t.danger),
                  const SizedBox(width: 8),
                  Text('Cancelar convite',
                      style: TextStyle(
                          color: t.danger,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
