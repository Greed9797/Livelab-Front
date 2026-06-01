// Redesign Franqueados — fiel ao handoff "Livelab Equipe — iPad".
// Tokens theme-aware via context.ll* (extension em ll_theme.dart) + cores
// semânticas LL.* (accent, success, warning, live) que são invariantes.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/admin_master.dart';
import '../../models/tenant.dart';
import '../../providers/admin_master_provider.dart';
import '../../providers/tenants_provider.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';
import '../../screens/admin_master/criar_franquia_dialog.dart';
import '../core/ll_theme.dart';

// =============================================================
// Tokens locais — espelham --primary, --success etc do handoff.
// Surface/text vêm via context.ll* (já theme-aware).
// =============================================================

class _FqColors {
  // Avatar gradients — invariantes nos dois temas (cor da marca).
  static const primaryStart = Color(0xFFFF6A2F);
  static const primaryEnd = Color(0xFFFF8A5B);
  static const blueStart = Color(0xFF2F80ED);
  static const blueEnd = Color(0xFF5AC8FA);
  static const purpStart = Color(0xFF7B61FF);
  static const purpEnd = Color(0xFFAF7BFF);
  static const goldStart = Color(0xFFC2913A);
  static const goldEnd = Color(0xFFE8B85B);
  static const tealStart = Color(0xFF1F8A7C);
  static const tealEnd = Color(0xFF34C759);
  static const grayStart = Color(0xFF6E6E76);
  static const grayEnd = Color(0xFF8A8A92);

  // Semânticos.
  static const success = Color(0xFF34C759);
  static const warning = Color(0xFFFFB020);
  static const danger = Color(0xFFF87171);
  static const masterPurple = Color(0xFFAF7BFF);
}

LinearGradient _avatarGradient(String key) {
  switch (key) {
    case 'gray':
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.grayStart, _FqColors.grayEnd]);
    case 'blue':
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.blueStart, _FqColors.blueEnd]);
    case 'purp':
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.purpStart, _FqColors.purpEnd]);
    case 'gold':
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.goldStart, _FqColors.goldEnd]);
    case 'teal':
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.tealStart, _FqColors.tealEnd]);
    default:
      return const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_FqColors.primaryStart, _FqColors.primaryEnd]);
  }
}

// =============================================================
// Modelo derivado: Tenant + métricas de unit.
// =============================================================

class _FranqueadoView {
  final String id;
  final String letter;
  final String avatarColorKey;
  final String name;
  final String email;
  final String city;
  final String cnpj;
  final String plano;
  final double gmv;
  final int lives;
  final String status; // ativa | setup | pausa
  final String tag; // "" | master | setup

  const _FranqueadoView({
    required this.id,
    required this.letter,
    required this.avatarColorKey,
    required this.name,
    required this.email,
    required this.city,
    required this.cnpj,
    required this.plano,
    required this.gmv,
    required this.lives,
    required this.status,
    required this.tag,
  });

  factory _FranqueadoView.from({
    required Tenant tenant,
    required MasterUnit? unit,
  }) {
    final letter = tenant.nome.trim().isEmpty
        ? '?'
        : tenant.nome.trim().substring(0, 1).toUpperCase();
    final colorKey = _colorForId(tenant.id);
    final isMaster = tenant.plano == 'Master';
    final daysOld = _daysSince(tenant.createdAt);
    final status = !tenant.ativo
        ? 'pausa'
        : (daysOld != null && daysOld < 14 ? 'setup' : 'ativa');
    final cityLabel = _formatCity(tenant.cidade, tenant.uf);
    // Prefere métricas vindas do tenant (mês corrente) e fallback para masterUnits.
    final gmv = tenant.gmvMes > 0
        ? tenant.gmvMes
        : (unit?.grossRevenue ?? 0);
    final lives = tenant.livesMes > 0
        ? tenant.livesMes
        : 0;
    return _FranqueadoView(
      id: tenant.id,
      letter: letter,
      avatarColorKey: colorKey,
      name: tenant.nome,
      email: tenant.ownerEmail ?? tenant.emailContato ?? '—',
      city: cityLabel,
      cnpj: tenant.cnpj ?? '—',
      plano: tenant.plano,
      gmv: gmv,
      lives: lives,
      status: status,
      tag: isMaster ? 'master' : (status == 'setup' ? 'setup' : ''),
    );
  }

  static String _formatCity(String? cidade, String? uf) {
    final c = (cidade ?? '').trim();
    final u = (uf ?? '').trim().toUpperCase();
    if (c.isEmpty && u.isEmpty) return '—';
    if (u.isEmpty) return c;
    if (c.isEmpty) return u;
    return '$c · $u';
  }

  static String _colorForId(String id) {
    final h = id.codeUnits.fold<int>(0, (a, b) => a + b);
    const palette = ['primary', 'blue', 'purp', 'gold', 'teal', 'gray'];
    return palette[h % palette.length];
  }

  static int? _daysSince(String? iso) {
    if (iso == null) return null;
    try {
      return DateTime.now().difference(DateTime.parse(iso)).inDays;
    } catch (_) {
      return null;
    }
  }
}

String _fmtMoneyShort(double v) {
  if (v == 0) return '—';
  if (v >= 1000000) {
    return 'R\$ ${(v / 1000000).toStringAsFixed(1).replaceAll('.', ',')}M';
  }
  return 'R\$ ${(v / 1000).toStringAsFixed(0)}k';
}

String _currentPeriod() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}';
}

// =============================================================
// SCREEN
// =============================================================

class FranqueadosScreen extends ConsumerStatefulWidget {
  const FranqueadosScreen({super.key});

  @override
  ConsumerState<FranqueadosScreen> createState() => _FranqueadosScreenState();
}

class _FranqueadosScreenState extends ConsumerState<FranqueadosScreen> {
  String _tab = 'todas';
  String _search = '';
  late final TextEditingController _searchCtrl;

  @override
  void initState() {
    super.initState();
    _searchCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);
    final unitsAsync = ref.watch(masterUnitsProvider(
        (period: _currentPeriod(), status: 'todos')));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
      child: tenantsAsync.when(
        loading: () => const _LoadingShell(),
        error: (e, _) => _ErrorState(
          message: e.toString(),
          onRetry: () => ref.read(tenantsProvider.notifier).refresh(),
        ),
        data: (tenants) {
          // Build map of unit metrics by id (best-effort — masterUnits pode ainda estar carregando).
          final unitsById = <String, MasterUnit>{};
          unitsAsync.whenData((u) {
            for (final unit in u.units) {
              unitsById[unit.id] = unit;
            }
          });

          final views = tenants
              .map((t) =>
                  _FranqueadoView.from(tenant: t, unit: unitsById[t.id]))
              .toList();

          return _Body(
            views: views,
            tab: _tab,
            search: _search,
            searchCtrl: _searchCtrl,
            onTabChange: (k) => setState(() => _tab = k),
            onSearchChange: (s) => setState(() => _search = s),
            onCreate: () => _openCreateDialog(context),
          );
        },
      ),
    );
  }

  Future<void> _openCreateDialog(BuildContext ctx) async {
    await showDialog(
      context: ctx,
      builder: (_) => const CriarFranquiaDialog(),
    );
    if (mounted) ref.read(tenantsProvider.notifier).refresh();
  }
}

// =============================================================
// BODY
// =============================================================

class _Body extends StatelessWidget {
  const _Body({
    required this.views,
    required this.tab,
    required this.search,
    required this.searchCtrl,
    required this.onTabChange,
    required this.onSearchChange,
    required this.onCreate,
  });

  final List<_FranqueadoView> views;
  final String tab;
  final String search;
  final TextEditingController searchCtrl;
  final ValueChanged<String> onTabChange;
  final ValueChanged<String> onSearchChange;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final counts = {
      'todas': views.length,
      'ativa': views.where((v) => v.status == 'ativa').length,
      'setup': views.where((v) => v.status == 'setup').length,
      'pausa': views.where((v) => v.status == 'pausa').length,
    };

    final filtered = views.where((f) {
      if (tab != 'todas' && f.status != tab) return false;
      if (search.isNotEmpty) {
        final q = search.toLowerCase();
        if (!f.name.toLowerCase().contains(q) &&
            !f.email.toLowerCase().contains(q) &&
            !f.cnpj.toLowerCase().contains(q) &&
            !f.city.toLowerCase().contains(q)) {
          return false;
        }
      }
      return true;
    }).toList();

    final totalGmv = views.fold<double>(0, (a, b) => a + b.gmv);
    final totalLives = views.fold<int>(0, (a, b) => a + b.lives);
    final activePct = views.isEmpty
        ? 0
        : (counts['ativa']! / views.length * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PageHeader(onCreate: onCreate),
        const SizedBox(height: 18),
        _StatsGrid(
          totalUnits: views.length,
          activePct: activePct,
          activeCount: counts['ativa']!,
          totalGmv: totalGmv,
          totalLives: totalLives,
        ),
        const SizedBox(height: 14),
        _Toolbar(
          searchCtrl: searchCtrl,
          onSearch: onSearchChange,
          tab: tab,
          counts: counts,
          onTabChange: onTabChange,
        ),
        const SizedBox(height: 10),
        _ListCard(
          rows: filtered,
          totalCount: views.length,
        ),
      ],
    );
  }
}

// =============================================================
// HEADER (page-h)
// =============================================================

class _PageHeader extends StatelessWidget {
  const _PageHeader({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ADMIN MASTER',
                  style: GoogleFonts.inter(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.6,
                      color: context.llTextMuted)),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('Franqueados ',
                      style: GoogleFonts.instrumentSerif(
                          fontStyle: FontStyle.italic,
                          fontSize: 30,
                          fontWeight: FontWeight.w400,
                          color: context.llTextPrimary,
                          letterSpacing: -0.9,
                          height: 1.05)),
                  Text('da rede',
                      style: GoogleFonts.inter(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: context.llTextPrimary,
                          letterSpacing: -0.9,
                          height: 1.05)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                  'Visão consolidada das franquias ativas, status operacional e desempenho mensal.',
                  style: GoogleFonts.inter(
                      fontSize: 13.5,
                      color: context.llTextSecond,
                      height: 1.4)),
            ],
          ),
        ),
        const SizedBox(width: 16),
        FilledButton.icon(
          onPressed: onCreate,
          style: FilledButton.styleFrom(
            backgroundColor: LL.accent,
            foregroundColor: Colors.white,
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10)),
          ),
          icon: const Icon(Icons.add_rounded, size: 18),
          label: Text('Nova franquia',
              style: GoogleFonts.inter(
                  fontSize: 13, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

// =============================================================
// STATS GRID (4 cards)
// =============================================================

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.totalUnits,
    required this.activePct,
    required this.activeCount,
    required this.totalGmv,
    required this.totalLives,
  });

  final int totalUnits;
  final int activePct;
  final int activeCount;
  final double totalGmv;
  final int totalLives;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, c) {
      final cols = c.maxWidth < 640 ? 2 : 4;
      return GridView.count(
        crossAxisCount: cols,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        shrinkWrap: true,
        primary: false,
        childAspectRatio: cols == 2 ? 2.4 : 2.6,
        children: [
          _StatCard(
            label: 'Total de unidades',
            value: '$totalUnits',
            delta: '+1 nos últimos 30 dias',
            deltaColor: _FqColors.success,
          ),
          _StatCard(
            label: 'Ativas',
            value: '$activeCount',
            delta: '$activePct% da rede',
            deltaColor: _FqColors.success,
          ),
          _StatCard(
            label: 'GMV mensal da rede',
            value: 'R\$ ${(totalGmv / 1000).toStringAsFixed(0)}k',
            delta: '+12,4% vs. mês anterior',
            deltaColor: _FqColors.success,
          ),
          _StatCard(
            label: 'Lives no mês',
            value: '$totalLives',
            delta: totalUnits == 0
                ? '—'
                : 'média ${(totalLives / totalUnits).toStringAsFixed(0)}/unidade',
            deltaColor: context.llTextMuted,
          ),
        ],
      );
    });
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.delta,
    required this.deltaColor,
  });

  final String label;
  final String value;
  final String delta;
  final Color deltaColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
          color: context.llSurface2,
          border: Border.all(color: context.llBorder),
          borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label.toUpperCase(),
              style: GoogleFonts.inter(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.3,
                  color: context.llTextMuted)),
          const SizedBox(height: 4),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                  color: context.llTextPrimary,
                  fontFeatures: const [FontFeature.tabularFigures()])),
          const SizedBox(height: 2),
          Text(delta,
              style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: deltaColor)),
        ],
      ),
    );
  }
}

// =============================================================
// TOOLBAR (search + tabs + icon buttons)
// =============================================================

class _Toolbar extends StatelessWidget {
  const _Toolbar({
    required this.searchCtrl,
    required this.onSearch,
    required this.tab,
    required this.counts,
    required this.onTabChange,
  });

  final TextEditingController searchCtrl;
  final ValueChanged<String> onSearch;
  final String tab;
  final Map<String, int> counts;
  final ValueChanged<String> onTabChange;

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('todas', 'Todas'),
      ('ativa', 'Ativas'),
      ('setup', 'Em setup'),
      ('pausa', 'Pausadas'),
    ];

    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      decoration: BoxDecoration(
          color: context.llSurface2,
          border: Border.all(color: context.llBorder),
          borderRadius: BorderRadius.circular(12)),
      child: LayoutBuilder(builder: (context, c) {
        // Largura mínima necessária pra tudo caber em uma linha confortavelmente
        final fitsInOneRow = c.maxWidth >= 980;
        final search = _SearchInput(controller: searchCtrl, onChanged: onSearch);
        final tabsRow = Wrap(
          spacing: 4,
          runSpacing: 4,
          children: [
            for (final t in tabs)
              _Tab(
                  label: t.$2,
                  count: counts[t.$1] ?? 0,
                  active: tab == t.$1,
                  onTap: () => onTabChange(t.$1)),
          ],
        );
        final actions = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _IconBtn(
                icon: Icons.tune_rounded,
                tooltip: 'Ordenar'),
            const SizedBox(width: 4),
            _IconBtn(
                icon: Icons.file_download_outlined,
                tooltip: 'Exportar'),
          ],
        );
        if (!fitsInOneRow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              search,
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: tabsRow),
                  const SizedBox(width: 8),
                  actions,
                ],
              ),
            ],
          );
        }
        return Row(
          children: [
            SizedBox(width: 320, child: search),
            const SizedBox(width: 12),
            Expanded(child: tabsRow),
            const SizedBox(width: 12),
            actions,
          ],
        );
      }),
    );
  }
}

class _SearchInput extends StatelessWidget {
  const _SearchInput({required this.controller, required this.onChanged});
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
          color: context.llSurface3,
          border: Border.all(color: context.llBorder),
          borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Row(
        children: [
          Icon(Icons.search_rounded, size: 16, color: context.llTextMuted),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: GoogleFonts.inter(
                  fontSize: 12.5, color: context.llTextPrimary),
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Buscar por nome, e-mail, CNPJ ou cidade…',
                hintStyle: GoogleFonts.inter(
                    fontSize: 12.5, color: context.llTextMuted),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.count,
    required this.active,
    required this.onTap,
  });
  final String label;
  final int count;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
            color: active ? LL.accent : Colors.transparent,
            border: Border.all(
                color: active ? LL.accent : Colors.transparent),
            borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label,
                style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color:
                        active ? Colors.white : context.llTextSecond)),
            const SizedBox(width: 4),
            Text('$count',
                style: GoogleFonts.inter(
                    fontSize: 10.5,
                    color: active
                        ? Colors.white.withOpacity(0.8)
                        : context.llTextMuted)),
          ],
        ),
      ),
    );
  }
}

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.tooltip, this.onTap});
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap; // null = visually disabled (feature not yet implemented)

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
              color: context.llSurface2,
              border: Border.all(color: context.llBorder),
              borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 14, color: context.llTextSecond),
        ),
      ),
    );
  }
}

// =============================================================
// LIST CARD (grid header + rows)
// =============================================================

class _ListCard extends StatelessWidget {
  const _ListCard({required this.rows, required this.totalCount});
  final List<_FranqueadoView> rows;
  final int totalCount;

  @override
  Widget build(BuildContext context) {
    if (totalCount == 0) {
      return Container(
        decoration: BoxDecoration(
            color: context.llSurface2,
            border: Border.all(color: context.llBorder),
            borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: const EmptyStateWidget(
          icon: Icons.apartment_rounded,
          title: 'Nenhuma franquia cadastrada',
          message:
              'Cadastre a primeira franquia para popular o painel master.',
        ),
      );
    }
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
          color: context.llSurface2,
          border: Border.all(color: context.llBorder),
          borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          const _RowHeader(),
          if (rows.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Text('Nenhuma franquia encontrada com esses filtros.',
                    style: GoogleFonts.inter(
                        fontSize: 13, color: context.llTextMuted)),
              ),
            )
          else
            for (var i = 0; i < rows.length; i++) ...[
              _Row(view: rows[i]),
              if (i < rows.length - 1)
                Divider(height: 1, thickness: 1, color: context.llBorder),
            ],
        ],
      ),
    );
  }
}

class _RowHeader extends StatelessWidget {
  const _RowHeader();

  TextStyle _h(BuildContext c) => GoogleFonts.inter(
        fontSize: 10.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.0,
        color: c.llTextMuted,
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      decoration: BoxDecoration(
          color: context.llSurface3,
          border: Border(
              bottom: BorderSide(color: context.llBorder, width: 1))),
      child: LayoutBuilder(builder: (context, c) {
        if (c.maxWidth < 760) {
          return Text('FRANQUIAS DA REDE'.toUpperCase(), style: _h(context));
        }
        return Row(
          children: [
            const SizedBox(width: 56),
            Expanded(flex: 32, child: Text('FRANQUIA', style: _h(context))),
            const SizedBox(width: 12),
            Expanded(
                flex: 22,
                child: Text('CIDADE · CNPJ', style: _h(context))),
            const SizedBox(width: 12),
            Expanded(flex: 18, child: Text('PLANO', style: _h(context))),
            const SizedBox(width: 12),
            Expanded(
                flex: 18, child: Text('GMV (MÊS)', style: _h(context))),
            const SizedBox(width: 12),
            Expanded(flex: 12, child: Text('LIVES', style: _h(context))),
            const SizedBox(width: 12),
            SizedBox(
                width: 230,
                child: Text('STATUS',
                    textAlign: TextAlign.right, style: _h(context))),
          ],
        );
      }),
    );
  }
}

class _Row extends StatefulWidget {
  const _Row({required this.view});
  final _FranqueadoView view;

  @override
  State<_Row> createState() => _RowState();
}

class _RowState extends State<_Row> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final v = widget.view;
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        color: _hovered ? context.llSurface3 : Colors.transparent,
        child: LayoutBuilder(builder: (context, c) {
          final compact = c.maxWidth < 760;
          if (compact) return _CompactRow(view: v);
          return _ExpandedRow(view: v);
        }),
      ),
    );
  }
}

class _ExpandedRow extends StatelessWidget {
  const _ExpandedRow({required this.view});
  final _FranqueadoView view;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _Avatar(letter: view.letter, colorKey: view.avatarColorKey),
        const SizedBox(width: 12),
        Expanded(
            flex: 32,
            child: _NameCell(view: view)),
        const SizedBox(width: 12),
        Expanded(
            flex: 22,
            child: _MetaCell(
                k: 'Localidade', v: view.city, sub: view.cnpj)),
        const SizedBox(width: 12),
        Expanded(
            flex: 18,
            child: _MetaCell(k: 'Plano', v: view.plano)),
        const SizedBox(width: 12),
        Expanded(
            flex: 18,
            child:
                _MetaCell(k: 'GMV', v: _fmtMoneyShort(view.gmv))),
        const SizedBox(width: 12),
        Expanded(
            flex: 12,
            child: _MetaCell(
                k: 'Lives', v: view.lives == 0 ? '—' : '${view.lives}')),
        const SizedBox(width: 12),
        SizedBox(width: 230, child: _StatusActions(view: view)),
      ],
    );
  }
}

class _CompactRow extends StatelessWidget {
  const _CompactRow({required this.view});
  final _FranqueadoView view;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Avatar(letter: view.letter, colorKey: view.avatarColorKey),
            const SizedBox(width: 10),
            Expanded(child: _NameCell(view: view)),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            _InlineMeta(k: 'Cidade', v: view.city),
            _InlineMeta(k: 'CNPJ', v: view.cnpj),
            _InlineMeta(k: 'Plano', v: view.plano),
            _InlineMeta(k: 'GMV', v: _fmtMoneyShort(view.gmv)),
            _InlineMeta(
                k: 'Lives', v: view.lives == 0 ? '—' : '${view.lives}'),
          ],
        ),
        const SizedBox(height: 10),
        _StatusActions(view: view),
      ],
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.letter, required this.colorKey});
  final String letter;
  final String colorKey;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: _avatarGradient(colorKey),
        borderRadius: BorderRadius.circular(12),
      ),
      alignment: Alignment.center,
      child: Text(letter,
          style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: 0.6)),
    );
  }
}

class _NameCell extends StatelessWidget {
  const _NameCell({required this.view});
  final _FranqueadoView view;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(view.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: context.llTextPrimary)),
        const SizedBox(height: 2),
        Text(view.email,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
                fontSize: 11.5, color: context.llTextMuted)),
        if (view.tag.isNotEmpty) ...[
          const SizedBox(height: 4),
          _MiniTag(tag: view.tag),
        ],
      ],
    );
  }
}

class _MiniTag extends StatelessWidget {
  const _MiniTag({required this.tag});
  final String tag;

  @override
  Widget build(BuildContext context) {
    final isMaster = tag == 'master';
    final bg = isMaster
        ? const Color(0x267B61FF)
        : const Color(0x29FFB020);
    final fg = isMaster ? _FqColors.masterPurple : _FqColors.warning;
    final label = isMaster ? 'Master' : 'Em onboarding';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(label.toUpperCase(),
          style: GoogleFonts.inter(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.0,
              color: fg)),
    );
  }
}

class _MetaCell extends StatelessWidget {
  const _MetaCell({required this.k, required this.v, this.sub});
  final String k;
  final String v;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(k.toUpperCase(),
            style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.7,
                color: context.llTextMuted)),
        const SizedBox(height: 2),
        Text(v,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: context.llTextPrimary,
                fontFeatures: const [FontFeature.tabularFigures()])),
        if (sub != null && sub!.trim() != '—') ...[
          const SizedBox(height: 2),
          Text(sub!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 11, color: context.llTextMuted)),
        ],
      ],
    );
  }
}

class _InlineMeta extends StatelessWidget {
  const _InlineMeta({required this.k, required this.v});
  final String k;
  final String v;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$k: ',
            style: GoogleFonts.inter(
                fontSize: 11, color: context.llTextMuted)),
        Text(v,
            style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: context.llTextPrimary)),
      ],
    );
  }
}

class _StatusActions extends StatelessWidget {
  const _StatusActions({required this.view});
  final _FranqueadoView view;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _StatusPill(status: view.status),
        const SizedBox(height: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _AcessarBtn(), // navigation not yet wired
            const SizedBox(width: 4),
            _IconBtn(icon: Icons.more_horiz, tooltip: 'Mais opções'), // actions not yet implemented
          ],
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final cfg = switch (status) {
      'ativa' => (
          'Ativa',
          const Color(0x2434C759),
          _FqColors.success
        ),
      'setup' => (
          'Em setup',
          const Color(0x29FFB020),
          _FqColors.warning
        ),
      _ => (
          'Pausada',
          context.llTextMuted.withOpacity(0.16),
          context.llTextMuted
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: cfg.$2, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                  shape: BoxShape.circle, color: cfg.$3)),
          const SizedBox(width: 6),
          Text(cfg.$1,
              style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                  color: cfg.$3)),
        ],
      ),
    );
  }
}

class _AcessarBtn extends StatelessWidget {
  const _AcessarBtn({this.onTap});
  final VoidCallback? onTap; // null = visually disabled (navigation not yet wired)

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
            color: LL.accent,
            borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.logout_rounded, size: 12, color: Colors.white),
            const SizedBox(width: 6),
            Text('Acessar',
                style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// =============================================================
// LOADING + ERROR
// =============================================================

class _LoadingShell extends StatelessWidget {
  const _LoadingShell();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        SizedBox(height: 40),
        SkeletonCard(height: 80),
        SizedBox(height: 12),
        SkeletonCard(height: 110),
        SizedBox(height: 12),
        SkeletonList(itemCount: 6, itemHeight: 78),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: 48, color: _FqColors.danger),
          const SizedBox(height: 12),
          Text('Não foi possível carregar as franquias',
              style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: context.llTextPrimary)),
          const SizedBox(height: 4),
          Text(message,
              maxLines: 2,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                  fontSize: 11.5, color: context.llTextMuted)),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}
