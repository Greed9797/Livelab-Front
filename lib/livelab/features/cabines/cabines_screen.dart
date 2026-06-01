import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../routes/app_routes.dart';
import '../../../screens/solicitacoes/solicitacoes_screen.dart';
import '../../../services/api_service.dart';
import '../../core/responsive.dart';
import '../../theme/tokens.dart';
import '../../theme/livelab_theme.dart';
import '../../widgets/livelab_scaffold.dart';
import '../../widgets/ll_button.dart';
import 'cabines_models.dart';
import 'cabines_repository.dart';
import 'widgets/cabin_card.dart';
import 'widgets/cabin_filter_bar.dart';
import 'widgets/occupancy_panel.dart';
import 'widgets/schedule_timeline.dart';
import 'widgets/quick_actions_panel.dart';

class CabinesScreen extends StatefulWidget {
  const CabinesScreen({super.key, required this.repository});
  final CabinesRepository repository;

  @override
  State<CabinesScreen> createState() => _CabinesScreenState();
}

class _CabinesScreenState extends State<CabinesScreen> {
  late Future<List<Cabin>> _future;
  late Future<List<UpcomingScheduleEntry>> _proximasFuture;
  CabinFilters _filters = const CabinFilters();
  int? _selected;
  final Set<String> _busy = {};

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = widget.repository.fetchAll();
      _proximasFuture = widget.repository.fetchProximas4h();
    });
  }

  void _setBusy(String id, bool busy) {
    if (!mounted) return;
    setState(() {
      if (busy) {
        _busy.add(id);
      } else {
        _busy.remove(id);
      }
    });
  }

  void _toast(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? Colors.red.shade700 : null,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _runAction(Cabin c, Future<void> Function() action, String successMsg) async {
    _setBusy(c.id, true);
    try {
      await action();
      _toast(successMsg);
      _reload();
    } catch (e) {
      _toast(ApiService.extractErrorMessage(e), error: true);
    } finally {
      _setBusy(c.id, false);
    }
  }

  Future<void> _iniciarLive(Cabin c) async {
    final clienteId = c.clienteId;
    if (clienteId == null || clienteId.isEmpty) {
      _toast('Cabine sem cliente vinculado. Reserve antes de iniciar.', error: true);
      return;
    }
    final tituloCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Iniciar live · Cabine ${c.number.toString().padLeft(2, '0')}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(c.client ?? 'Cliente vinculado'),
            const SizedBox(height: 12),
            TextField(
              controller: tituloCtrl,
              decoration: const InputDecoration(
                labelText: 'Título da live (opcional)',
                hintText: 'Ex: Beauty Trend Quinta',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Iniciar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _runAction(
      c,
      () => widget.repository.iniciarLiveManual(
        c.id,
        clienteId: clienteId,
        titulo: tituloCtrl.text.trim().isEmpty ? null : tituloCtrl.text.trim(),
      ),
      'Live iniciada na cabine ${c.number.toString().padLeft(2, '0')}',
    );
  }

  Future<void> _encerrarLive(Cabin c) async {
    final liveId = c.liveAtualId;
    if (liveId == null) {
      _toast('Sem live ativa nesta cabine', error: true);
      return;
    }
    final fatCtrl = TextEditingController(text: c.gmv > 0 ? c.gmv.toStringAsFixed(2) : '');
    final qtdCtrl = TextEditingController();
    final resumoCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    // Passo 1: dados consolidados (GMV, pedidos, resumo)
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Encerrar live · Cabine ${c.number.toString().padLeft(2, '0')}'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Preencha os dados consolidados da live para encerrar.',
                  style: TextStyle(color: Theme.of(ctx).hintColor, fontSize: 13),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: fatCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'GMV total (R\$) *',
                    prefixText: 'R\$ ',
                    hintText: '0,00',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                    if (n == null) return 'Valor inválido';
                    if (n < 0) return 'Não pode ser negativo';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: qtdCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Qtd de pedidos *',
                    hintText: '0',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    final n = int.tryParse((v ?? '').trim());
                    if (n == null) return 'Número obrigatório';
                    if (n < 0) return 'Não pode ser negativo';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: resumoCtrl,
                  maxLines: 3,
                  maxLength: 2000,
                  decoration: const InputDecoration(
                    labelText: 'Resumo (opcional)',
                    hintText: 'Observações da live, destaques, problemas...',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(ctx, true);
              }
            },
            child: const Text('Encerrar e salvar'),
          ),
        ],
      ),
    );

    if (ok != true) return;

    final fat = double.tryParse(fatCtrl.text.replaceAll(',', '.')) ?? 0;
    final qtd = int.tryParse(qtdCtrl.text.trim());
    final resumo = resumoCtrl.text.trim().isEmpty ? null : resumoCtrl.text.trim();

    // Passo 2: métricas manuais (opcional)
    int? manualLikes;
    int? manualViews;
    int? manualOrders;
    double? manualGmv;

    if (mounted) {
      final metricsResult = await showDialog<_ManualMetrics?>(
        context: context,
        builder: (ctx) => _MetricasManualDialog(cabineNumero: c.number),
      );
      if (metricsResult != null) {
        manualLikes  = metricsResult.likes;
        manualViews  = metricsResult.views;
        manualOrders = metricsResult.orders;
        manualGmv    = metricsResult.gmv;
      }
      // metricsResult == null significa "Pular" — encerra sem métricas manuais
    }

    await _runAction(
      c,
      () => widget.repository.encerrarLive(
        liveId,
        fatGerado: fat,
        qtdPedidos: qtd,
        resumo: resumo,
        manualLikes:  manualLikes,
        manualViews:  manualViews,
        manualOrders: manualOrders,
        manualGmv:    manualGmv,
      ),
      'Live encerrada · R\$ ${fat.toStringAsFixed(2)} · ${qtd ?? 0} pedidos',
    );
  }

  Future<void> _liberar(Cabin c) async {
    await _runAction(
      c,
      () => widget.repository.liberarCabine(c.id),
      'Cabine ${c.number.toString().padLeft(2, '0')} liberada',
    );
  }

  Future<void> _setManutencao(Cabin c) async {
    final motivoCtrl = TextEditingController();
    final etaCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Agendar manutenção · Cabine ${c.number.toString().padLeft(2, '0')}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: motivoCtrl,
              decoration: const InputDecoration(
                labelText: 'Motivo *',
                hintText: 'Ex: troca de iluminação',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: etaCtrl,
              decoration: const InputDecoration(
                labelText: 'Previsão de retorno (opcional)',
                hintText: 'Ex: 16:00',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              if (motivoCtrl.text.trim().isEmpty) return;
              Navigator.pop(ctx, true);
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _runAction(
      c,
      () => widget.repository.setManutencao(
        c.id,
        motivo: motivoCtrl.text.trim(),
        eta: etaCtrl.text.trim().isEmpty ? null : etaCtrl.text.trim(),
      ),
      'Cabine em manutenção',
    );
  }

  Future<void> _abrirNovaLiveDialog(List<Cabin> all) async {
    final disponiveis = all.where((c) =>
      (c.status == CabinStatus.busy || c.status == CabinStatus.free) &&
      c.clienteId != null && c.clienteId!.isNotEmpty
    ).toList();
    if (disponiveis.isEmpty) {
      _toast('Nenhuma cabine com cliente vinculado. Reserve uma cabine primeiro.', error: true);
      return;
    }
    final selected = await showDialog<Cabin>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Selecione a cabine'),
        children: disponiveis.map((c) => SimpleDialogOption(
          onPressed: () => Navigator.pop(ctx, c),
          child: Text('Cabine ${c.number.toString().padLeft(2, '0')} · ${c.client ?? "—"}'),
        )).toList(),
      ),
    );
    if (selected != null) await _iniciarLive(selected);
  }

  @override
  Widget build(BuildContext context) {
    return LivelabScaffold(
      currentRoute: AppRoutes.cabines,
      onRefresh: _reload,
      child: DefaultTabController(
        length: 3,
        child: Builder(builder: (ctx) {
          final t = ctx.llTokens;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 12, 28, 0),
                child: TabBar(
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelColor: t.primary,
                  unselectedLabelColor: t.textSecondary,
                  indicatorColor: t.primary,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 13),
                  unselectedLabelStyle: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 13),
                  tabs: const [
                    Tab(text: 'Ao vivo'),
                    Tab(text: 'Histórico'),
                    Tab(text: 'Solicitações'),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    FutureBuilder<List<Cabin>>(
                      future: _future,
                      builder: (c, snap) {
                        if (snap.hasError) {
                          return Center(
                            child: Text(
                              'Erro ao carregar: ${snap.error}',
                              style: const TextStyle(color: Colors.red),
                            ),
                          );
                        }
                        if (!snap.hasData) {
                          return const Center(
                              child: CircularProgressIndicator());
                        }
                        return _content(snap.data!);
                      },
                    ),
                    const _HistoricoLivesTab(),
                    const SolicitacoesScreen(embedded: true),
                  ],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _content(List<Cabin> all) {
    final t = context.llTokens;
    final r = LlResponsive.of(context);
    final filtered = all.applyFilter(_filters);
    final counts = <CabinStatus?, int>{
      null: all.length,
      CabinStatus.live: all.where((c) => c.status == CabinStatus.live).length,
      CabinStatus.busy: all.where((c) => c.status == CabinStatus.busy).length,
      CabinStatus.free: all.where((c) => c.status == CabinStatus.free).length,
      CabinStatus.maint: all.where((c) => c.status == CabinStatus.maint).length,
    };

    return LayoutBuilder(builder: (c, box) {
      final cols = r.isMobile ? 1 : (r.isTablet ? 3 : (box.maxWidth > 1600 ? 4 : 3));
      final showRail = !r.isMobile;

      final grid = GridView.builder(
        primary: false,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: cols,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          mainAxisExtent: 420,
        ),
        itemCount: filtered.length,
        itemBuilder: (_, i) {
          final c = filtered[i];
          return CabinCard(
            cabin: c,
            selected: _selected == c.number,
            busy: _busy.contains(c.id),
            onTap: () => setState(() => _selected = c.number),
            onIniciarLive: () => _iniciarLive(c),
            onEncerrarLive: () => _encerrarLive(c),
            onLiberar: () => _liberar(c),
            onSetManutencao: () => _setManutencao(c),
          );
        },
      );

      final rail = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OccupancyPanel(cabins: all),
          const SizedBox(height: LlSpacing.md),
          FutureBuilder<List<UpcomingScheduleEntry>>(
            future: _proximasFuture,
            builder: (ctx, snap) {
              final entries = snap.data ?? const <UpcomingScheduleEntry>[];
              final liveCount = counts[CabinStatus.live] ?? 0;
              final liveNumbers = all
                  .where((c) => c.status == CabinStatus.live)
                  .map((c) => c.number)
                  .toList();
              final list = <ScheduleEntry>[
                if (liveCount > 0)
                  ScheduleEntry(
                    time: TimeOfDay.now().format(context),
                    title: '$liveCount lives em curso',
                    subtitle: 'Cabines ${liveNumbers.join(", ")}',
                    now: true,
                  ),
                ...entries.map((e) => ScheduleEntry(
                      time: e.timeLabel,
                      title: e.title,
                      subtitle: e.subtitle,
                    )),
              ];
              if (list.isEmpty) {
                list.add(const ScheduleEntry(
                  time: '—',
                  title: 'Nenhum agendamento próximo',
                  subtitle: 'Próximas 4 horas livres',
                ));
              }
              return ScheduleTimeline(entries: list);
            },
          ),
          const SizedBox(height: LlSpacing.md),
          QuickActionsPanel(
            actions: [
              QuickAction(
                icon: Icons.bolt,
                title: 'Iniciar nova live',
                subtitle: '${counts[CabinStatus.free]} cabines disponíveis',
                onTap: () => _abrirNovaLiveDialog(all),
              ),
              QuickAction(
                icon: Icons.notifications_active,
                title: 'Aprovar reservas',
                subtitle: 'Ver solicitações pendentes',
                onTap: () => Navigator.of(context).pushNamed(AppRoutes.solicitacoes),
              ),
              QuickAction(
                icon: Icons.settings,
                iconColor: t.warning,
                iconBg: t.warningSoft,
                title: 'Agendar manutenção',
                subtitle: '${counts[CabinStatus.maint]} em manutenção',
                onTap: () async {
                  if (all.isEmpty) return;
                  final livre = all.firstWhere(
                    (c) => c.status == CabinStatus.free,
                    orElse: () => all.first,
                  );
                  await _setManutencao(livre);
                },
              ),
            ],
          ),
        ],
      );

      return SingleChildScrollView(
        padding: EdgeInsets.all(r.isMobile ? LlSpacing.lg : LlSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _header(t, all),
            const SizedBox(height: LlSpacing.lg),
            CabinFilterBar(
              filters: _filters,
              counts: counts,
              onChanged: (f) => setState(() => _filters = f),
            ),
            const SizedBox(height: LlSpacing.lg),
            if (showRail)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: grid),
                  const SizedBox(width: LlSpacing.lg),
                  SizedBox(width: 320, child: rail),
                ],
              )
            else ...[
              grid,
              const SizedBox(height: LlSpacing.lg),
              rail,
            ],
          ],
        ),
      );
    });
  }

  Widget _header(LlTokens t, List<Cabin> all) {
    final live = all.where((c) => c.status == CabinStatus.live).length;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: 'Cabines',
                      style: GoogleFonts.instrumentSerif(
                        color: t.textPrimary,
                        fontStyle: FontStyle.italic,
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        letterSpacing: -1,
                      ),
                    ),
                    TextSpan(
                      text: ' ao vivo',
                      style: TextStyle(
                        color: t.textPrimary,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.6,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${all.length} cabines · $live transmitindo agora · ocupação em tempo real',
                style: TextStyle(color: t.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
        LlButton(
          label: 'Iniciar nova live',
          icon: Icons.bolt,
          onPressed: () => _abrirNovaLiveDialog(all),
        ),
      ],
    );
  }
}

class _HistoricoLivesTab extends StatefulWidget {
  const _HistoricoLivesTab();

  @override
  State<_HistoricoLivesTab> createState() => _HistoricoLivesTabState();
}

class _HistoricoLivesTabState extends State<_HistoricoLivesTab> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetch();
  }

  Future<List<Map<String, dynamic>>> _fetch() async {
    final resp = await ApiService.get<List<dynamic>>('/lives',
        params: const {'status': 'encerrada'});
    return (resp.data as List)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '—';
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }

  String _fmtMoney(num? v) {
    if (v == null || v == 0) return '—';
    return 'R\$ ${(v / 1).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return RefreshIndicator(
      onRefresh: () async => setState(() => _future = _fetch()),
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (c, snap) {
          if (snap.hasError) {
            return Center(child: Text('Erro: ${snap.error}'));
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final lives = snap.data!;
          if (lives.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history, size: 48, color: t.textMuted),
                  const SizedBox(height: 12),
                  Text('Nenhuma live encerrada ainda',
                      style: TextStyle(
                          color: t.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('O histórico aparece aqui após você encerrar uma live.',
                      style: TextStyle(color: t.textMuted, fontSize: 12)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(28),
            itemCount: lives.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final l = lives[i];
              final cabineNumero = l['cabine_numero']?.toString() ?? '?';
              final clienteNome = l['cliente_nome']?.toString() ?? 'Cliente';
              final apresentador = l['apresentador_nome']?.toString() ?? '—';
              final iniciadoEm = l['iniciado_em']?.toString();
              final encerradoEm = l['encerrado_em']?.toString();
              final fat = (l['fat_gerado'] as num?) ?? 0;
              final manualLikes  = l['manual_likes'] as int?;
              final manualViews  = l['manual_views'] as int?;
              final manualOrders = l['manual_orders'] as int?;
              final hasManual = manualLikes != null || manualViews != null || manualOrders != null;
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: t.bgElev1,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: t.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: t.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Text('C$cabineNumero',
                              style: TextStyle(
                                  color: t.primary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(clienteNome,
                                  style: TextStyle(
                                      color: t.textPrimary,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w800)),
                              Text('$apresentador · ${_fmtDate(iniciadoEm)} → ${_fmtDate(encerradoEm)}',
                                  style: TextStyle(
                                      color: t.textMuted, fontSize: 11.5)),
                            ],
                          ),
                        ),
                        Text(_fmtMoney(fat),
                            style: TextStyle(
                                color: t.success,
                                fontSize: 14,
                                fontWeight: FontWeight.w900)),
                      ],
                    ),
                    if (hasManual) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          if (manualLikes != null)
                            _MetricaBadge(label: 'Likes', value: manualLikes.toString(), tokens: t),
                          if (manualViews != null)
                            _MetricaBadge(label: 'Views', value: manualViews.toString(), tokens: t),
                          if (manualOrders != null)
                            _MetricaBadge(label: 'Vendas', value: manualOrders.toString(), tokens: t),
                        ],
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

// ─── Badge para exibir métricas manuais no histórico ─────────────────────────

class _MetricaBadge extends StatelessWidget {
  const _MetricaBadge({
    required this.label,
    required this.value,
    required this.tokens,
  });
  final String label;
  final String value;
  final LlTokens tokens;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: tokens.info.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: tokens.info.withValues(alpha: 0.25)),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(color: tokens.info, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// ─── Métricas manuais ao encerrar live ───────────────────────────────────────

class _ManualMetrics {
  final int? likes;
  final int? views;
  final int? orders;
  final double? gmv;

  const _ManualMetrics({this.likes, this.views, this.orders, this.gmv});
}

class _MetricasManualDialog extends StatefulWidget {
  final int cabineNumero;
  const _MetricasManualDialog({required this.cabineNumero});

  @override
  State<_MetricasManualDialog> createState() => _MetricasManualDialogState();
}

class _MetricasManualDialogState extends State<_MetricasManualDialog> {
  final _likesCtrl = TextEditingController();
  final _viewsCtrl = TextEditingController();
  final _ordersCtrl = TextEditingController();
  final _gmvCtrl = TextEditingController();

  @override
  void dispose() {
    _likesCtrl.dispose();
    _viewsCtrl.dispose();
    _ordersCtrl.dispose();
    _gmvCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textPrimary = theme.textTheme.bodyMedium?.color ?? Colors.black87;
    final textMuted = theme.hintColor;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(
        'Registrar métricas da live',
        style: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Opcional — preencha os dados da transmissão',
                style: TextStyle(color: textMuted, fontSize: 13),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _likesCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Likes recebidos',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _viewsCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Visualizações',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _ordersCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Vendas realizadas',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _gmvCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'GMV total (R\$)',
                  prefixText: 'R\$ ',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: Text('Pular', style: TextStyle(color: textMuted)),
        ),
        FilledButton(
          onPressed: () {
            final metrics = _ManualMetrics(
              likes: int.tryParse(_likesCtrl.text.trim()),
              views: int.tryParse(_viewsCtrl.text.trim()),
              orders: int.tryParse(_ordersCtrl.text.trim()),
              gmv: double.tryParse(_gmvCtrl.text.trim().replaceAll(',', '.')),
            );
            Navigator.of(context).pop(metrics);
          },
          child: const Text('Salvar e encerrar'),
        ),
      ],
    );
  }
}
