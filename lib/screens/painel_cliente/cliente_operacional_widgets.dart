import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../livelab/theme/livelab_theme.dart';
import '../../livelab/theme/tokens.dart' show LlTokens;
import '../../providers/cliente_dashboard_provider.dart'
    show ClientePeriod, clientePeriodProvider;
import '../../providers/cliente_operacional_provider.dart';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _dateShort = DateFormat('dd/MM', 'pt_BR');

// ---------------------------------------------------------------------------
// Helper de formatação — REGRA: null → "não informado", nunca "R\$ 0,00"
// ---------------------------------------------------------------------------
String formatOrNaoInformado(
  dynamic value, {
  bool isCurrency = false,
  bool isPercent = false,
  bool isHours = false,
  int decimals = 1,
}) {
  if (value == null) return 'não informado';
  if (value is double) {
    if (isCurrency) return _currency.format(value);
    if (isPercent) return '${value.toStringAsFixed(1)}%';
    if (isHours) return '${value.toStringAsFixed(1)}h';
    return value.toStringAsFixed(decimals);
  }
  if (value is int) {
    if (isCurrency) return _currency.format(value.toDouble());
    if (isPercent) return '$value%';
    return '$value';
  }
  return value.toString();
}

TextSpan _naoInformadoSpan(BuildContext context) => TextSpan(
      text: 'não informado',
      style: TextStyle(
        color: context.llTokens.textMuted,
        fontStyle: FontStyle.italic,
        fontSize: 13,
      ),
    );

// ---------------------------------------------------------------------------
// _StatusBadge — ok | atencao | critico | dados_incompletos
// ---------------------------------------------------------------------------
class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  _StatusConfig _config() {
    switch (status) {
      case 'ok':
        return _StatusConfig(
          label: 'Operação OK',
          color: AppColors.success,
          bg: AppColors.successBg,
          icon: PhosphorIcons.checkCircle(),
        );
      case 'atencao':
        return _StatusConfig(
          label: 'Atenção',
          color: AppColors.warning,
          bg: AppColors.warningBg,
          icon: PhosphorIcons.warning(),
        );
      case 'critico':
        return _StatusConfig(
          label: 'Crítico',
          color: AppColors.danger,
          bg: AppColors.dangerBg,
          icon: PhosphorIcons.warningCircle(),
        );
      default:
        return _StatusConfig(
          label: 'Dados incompletos',
          color: AppColors.info,
          bg: AppColors.infoBg,
          icon: PhosphorIcons.info(),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cfg = _config();
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x1,
      ),
      decoration: BoxDecoration(
        color: cfg.bg,
        borderRadius: AppRadius.fullR,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(cfg.icon, size: 13, color: cfg.color),
          const SizedBox(width: AppSpacing.x1),
          Text(
            cfg.label,
            style: AppTypography.badge.copyWith(color: cfg.color),
          ),
        ],
      ),
    );
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  final Color bg;
  final IconData icon;

  const _StatusConfig({
    required this.label,
    required this.color,
    required this.bg,
    required this.icon,
  });
}

// ---------------------------------------------------------------------------
// Card de status do período (topo)
// ---------------------------------------------------------------------------
class _StatusPeriodoCard extends StatelessWidget {
  final OperacionalStatus status;

  const _StatusPeriodoCard({required this.status});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final motivos = status.motivos.take(2).toList();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Status do Período',
                style: AppTypography.caption.copyWith(
                  color: t.textMuted,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.4,
                ),
              ),
              const Spacer(),
              _StatusBadge(status: status.status),
            ],
          ),
          if (motivos.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.x3),
            ...motivos.map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.x1),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      PhosphorIcons.dot(),
                      size: 12,
                      color: t.textSecondary,
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    Expanded(
                      child: Text(
                        m,
                        style: AppTypography.bodySmall
                            .copyWith(color: t.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (status.diagnostico != null) ...[
            const SizedBox(height: AppSpacing.x3),
            Text(
              status.diagnostico!,
              style: AppTypography.bodySmall.copyWith(color: t.textSecondary),
            ),
          ],
          if (status.proximaAcao != null) ...[
            const SizedBox(height: AppSpacing.x3),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  PhosphorIcons.arrowRight(),
                  size: 13,
                  color: t.textMuted,
                ),
                const SizedBox(width: AppSpacing.x2),
                Expanded(
                  child: Text(
                    status.proximaAcao!,
                    style: AppTypography.bodySmall.copyWith(
                      color: t.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Card GMV/h com barra de progresso
// ---------------------------------------------------------------------------
class _GmvHoraCard extends StatelessWidget {
  final double? gmvPorHora;
  final double? pctMetaHora;
  final double? metaGmvHora;

  const _GmvHoraCard({
    this.gmvPorHora,
    this.pctMetaHora,
    this.metaGmvHora,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final pct = pctMetaHora ?? 0;
    final progress = (pct / 100).clamp(0.0, 1.0);
    final barColor = pct >= 100
        ? AppColors.success
        : pct >= 70
            ? AppColors.warning
            : AppColors.danger;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(PhosphorIcons.chartBar(), size: 14, color: t.textMuted),
              const SizedBox(width: AppSpacing.x2),
              Text(
                'GMV / Hora',
                style: AppTypography.caption.copyWith(
                  color: t.textMuted,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          RichText(
            text: TextSpan(
              children: gmvPorHora != null
                  ? [
                      TextSpan(
                        text: _currency.format(gmvPorHora),
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: t.textPrimary,
                          letterSpacing: -0.5,
                          height: 1,
                        ),
                      ),
                      TextSpan(
                        text: '/h',
                        style: TextStyle(
                          fontSize: 13,
                          color: t.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ]
                  : [_naoInformadoSpan(context)],
            ),
          ),
          const SizedBox(height: AppSpacing.x3),
          ClipRRect(
            borderRadius: AppRadius.fullR,
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: t.border,
              color: barColor,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: AppSpacing.x2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                pctMetaHora != null
                    ? '${pctMetaHora!.toStringAsFixed(1)}% da meta'
                    : 'não informado',
                style: AppTypography.caption.copyWith(
                  color: pctMetaHora != null ? barColor : t.textMuted,
                  fontStyle:
                      pctMetaHora != null ? FontStyle.normal : FontStyle.italic,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                metaGmvHora != null
                    ? 'meta ${_currency.format(metaGmvHora)}/h'
                    : '',
                style: AppTypography.caption.copyWith(color: t.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// KPI card genérico para comissões e horas
// ---------------------------------------------------------------------------
class _MetricKpiCard extends StatelessWidget {
  final String label;
  final dynamic value;
  final IconData icon;
  final Color color;
  final bool isCurrency;
  final bool isHours;

  const _MetricKpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.isCurrency = false,
    this.isHours = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final isNull = value == null;
    final display = formatOrNaoInformado(
      value,
      isCurrency: isCurrency,
      isHours: isHours,
    );

    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: t.textMuted),
              const SizedBox(width: AppSpacing.x2),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.caption.copyWith(
                    color: t.textMuted,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          Text(
            display,
            style: isNull
                ? AppTypography.bodySmall.copyWith(
                    color: t.textMuted,
                    fontStyle: FontStyle.italic,
                  )
                : TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: t.textPrimary,
                    letterSpacing: -0.5,
                    height: 1,
                  ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Alertas críticos — máx 3 visíveis
// ---------------------------------------------------------------------------
class _AlertasCard extends StatelessWidget {
  final List<OperacionalAlerta> alertas;

  const _AlertasCard({required this.alertas});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final visiveis = alertas.take(3).toList();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: AppColors.dangerBg,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(PhosphorIcons.bellRinging(),
                  size: 14, color: AppColors.danger),
              const SizedBox(width: AppSpacing.x2),
              Text(
                'Alertas',
                style: AppTypography.caption.copyWith(
                  color: AppColors.danger,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                ),
              ),
              if (alertas.length > 3) ...[
                const Spacer(),
                Text(
                  '+${alertas.length - 3} mais',
                  style:
                      AppTypography.caption.copyWith(color: t.textMuted),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          ...visiveis.map((a) => _AlertaRow(alerta: a)),
        ],
      ),
    );
  }
}

class _AlertaRow extends StatelessWidget {
  final OperacionalAlerta alerta;

  const _AlertaRow({required this.alerta});

  String _formatData(String raw) {
    if (raw.isEmpty) return '';
    try {
      final dt = DateTime.tryParse(raw);
      if (dt != null) return _dateShort.format(dt);
    } catch (_) {}
    return raw.length > 10 ? raw.substring(0, 10) : raw;
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(PhosphorIcons.dot(), size: 10, color: AppColors.danger),
          const SizedBox(width: AppSpacing.x2),
          Expanded(
            child: Text(
              alerta.descricao,
              style: AppTypography.bodySmall
                  .copyWith(color: AppColors.danger),
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          Text(
            _formatData(alerta.data),
            style: AppTypography.caption.copyWith(color: t.textMuted),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Primeira dobra — substitui _KpiGrid
// Exposta como ConsumerWidget para acessar o period e os providers novos
// ---------------------------------------------------------------------------
class ClienteOperacionalTopSection extends ConsumerWidget {
  const ClienteOperacionalTopSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(clientePeriodProvider);
    final operacionalAsync = ref.watch(clienteOperacionalProvider(period));

    return operacionalAsync.when(
      loading: () => const _OperacionalSkeleton(),
      error: (e, _) => _OperacionalError(
        message: 'Não foi possível carregar métricas operacionais.',
      ),
      data: (op) => _OperacionalContent(operacional: op),
    );
  }
}

class _OperacionalSkeleton extends StatelessWidget {
  const _OperacionalSkeleton();

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _OperacionalError extends StatelessWidget {
  final String message;

  const _OperacionalError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: AppColors.dangerBg,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
      ),
      child: Text(
        message,
        style: AppTypography.bodySmall.copyWith(color: AppColors.danger),
      ),
    );
  }
}

class _OperacionalContent extends StatelessWidget {
  final ClienteOperacional operacional;

  const _OperacionalContent({required this.operacional});

  @override
  Widget build(BuildContext context) {
    final m = operacional.metricas;
    final cfg = operacional.config;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Linha 1 — status + alertas
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 700;
            final statusCard =
                _StatusPeriodoCard(status: operacional.status);
            if (operacional.alertas.isEmpty) return statusCard;
            if (wide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: statusCard),
                  const SizedBox(width: AppSpacing.x4),
                  Expanded(
                    child: _AlertasCard(alertas: operacional.alertas),
                  ),
                ],
              );
            }
            return Column(
              children: [
                statusCard,
                const SizedBox(height: AppSpacing.x4),
                _AlertasCard(alertas: operacional.alertas),
              ],
            );
          },
        ),

        const SizedBox(height: AppSpacing.x4),

        // Linha 2 — GMV/h + comissões + horas
        Wrap(
          spacing: AppSpacing.x4,
          runSpacing: AppSpacing.x4,
          children: [
            SizedBox(
              width: 240,
              child: _GmvHoraCard(
                gmvPorHora: m.gmvPorHora,
                pctMetaHora: m.pctMetaHora,
                metaGmvHora: cfg.metaGmvHora,
              ),
            ),
            SizedBox(
              width: 220,
              child: _MetricKpiCard(
                label: 'Comissão LiveLab total',
                value: m.comissaoLivelabTotal,
                icon: PhosphorIcons.currencyDollar(),
                color: AppColors.primary,
                isCurrency: true,
              ),
            ),
            SizedBox(
              width: 220,
              child: _MetricKpiCard(
                label: 'Comissão / hora',
                value: m.comissaoPorHora,
                icon: PhosphorIcons.arrowsClockwise(),
                color: AppColors.info,
                isCurrency: true,
              ),
            ),
            SizedBox(
              width: 180,
              child: _MetricKpiCard(
                label: 'Horas de live',
                value: m.horasLive,
                icon: PhosphorIcons.clock(),
                color: AppColors.success,
                isHours: true,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Tabela de sessões — nova seção
// ---------------------------------------------------------------------------
class ClienteSessoesSection extends ConsumerWidget {
  const ClienteSessoesSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(clientePeriodProvider);
    final sessoesAsync = ref.watch(clienteSessoesProvider(period));

    return sessoesAsync.when(
      loading: () => const _SessoesLoading(),
      error: (e, _) => _SessoesError(
        message: 'Não foi possível carregar sessões: $e',
      ),
      data: (resp) => _SessoesContent(
        response: resp,
        period: period,
      ),
    );
  }
}

class _SessoesLoading extends StatelessWidget {
  const _SessoesLoading();

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _SessoesError extends StatelessWidget {
  final String message;

  const _SessoesError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.x5),
      decoration: BoxDecoration(
        color: AppColors.dangerBg,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
      ),
      child: Text(
        message,
        style: AppTypography.bodySmall.copyWith(color: AppColors.danger),
      ),
    );
  }
}

class _SessoesContent extends ConsumerWidget {
  final SessoesResponse response;
  final ClientePeriod period;

  const _SessoesContent({
    required this.response,
    required this.period,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.llTokens;
    final hasMore = response.sessoes.length < response.total;

    return Container(
      decoration: BoxDecoration(
        color: t.bgElev2,
        borderRadius: AppRadius.lgR,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.x5,
              AppSpacing.x5,
              AppSpacing.x5,
              AppSpacing.x4,
            ),
            child: Row(
              children: [
                Icon(PhosphorIcons.list(), size: 16, color: t.textMuted),
                const SizedBox(width: AppSpacing.x2),
                Text(
                  'Sessões de Live',
                  style: AppTypography.h4.copyWith(color: t.textPrimary),
                ),
                const Spacer(),
                Text(
                  '${response.sessoes.length} de ${response.total}',
                  style: AppTypography.caption.copyWith(color: t.textMuted),
                ),
              ],
            ),
          ),
          if (response.sessoes.isEmpty)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.x8),
              child: Center(
                child: Text(
                  'Nenhuma sessão neste período.',
                  style: AppTypography.bodySmall
                      .copyWith(color: t.textMuted),
                ),
              ),
            )
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final isNarrow =
                    constraints.maxWidth < AppBreakpoints.tablet;
                return isNarrow
                    ? _SessoesCards(sessoes: response.sessoes)
                    : _SessoesTable(sessoes: response.sessoes);
              },
            ),
          if (hasMore)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.x5),
              child: Center(
                child: OutlinedButton.icon(
                  onPressed: () => ref
                      .read(clienteSessoesProvider(period).notifier)
                      .loadMore(period),
                  icon: Icon(PhosphorIcons.arrowDown(), size: 14),
                  label: const Text('Carregar mais'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: t.primary,
                    side: BorderSide(color: t.border),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tabela desktop
// ---------------------------------------------------------------------------
class _SessoesTable extends StatelessWidget {
  final List<SessaoLive> sessoes;

  const _SessoesTable({required this.sessoes});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 900),
        child: Column(
          children: [
            _TableHeader(t: t),
            const Divider(height: 1),
            ...sessoes.map((s) => _SessaoRow(sessao: s, t: t)),
          ],
        ),
      ),
    );
  }
}

class _TableHeader extends StatelessWidget {
  final LlTokens t;

  const _TableHeader({required this.t});

  @override
  Widget build(BuildContext context) {
    final style = AppTypography.tableTh.copyWith(
      color: t.textMuted,
      letterSpacing: 0.3,
    );
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x5,
        vertical: AppSpacing.x3,
      ),
      child: Row(
        children: [
          SizedBox(width: 72, child: Text('Data', style: style)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 120, child: Text('Apresentadora', style: style)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 60,
              child: Text('Horas', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 90,
              child:
                  Text('GMV', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 60,
              child: Text('Pedidos', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 60,
              child:
                  Text('Views', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 60,
              child: Text('Cliques', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 90,
              child:
                  Text('GMV/h', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 100,
              child:
                  Text('Com. LiveLab', style: style, textAlign: TextAlign.right)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 110,
              child: Text('Com. Apresent.', style: style)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 70, child: Text('Status', style: style)),
          const SizedBox(width: AppSpacing.x4),
          Expanded(child: Text('Problema / Ação', style: style)),
        ],
      ),
    );
  }
}

class _SessaoRow extends StatelessWidget {
  final SessaoLive sessao;
  final LlTokens t;

  const _SessaoRow({required this.sessao, required this.t});

  String _fmtData(String? raw) {
    if (raw == null || raw.isEmpty) return '–';
    try {
      final dt = DateTime.tryParse(raw);
      if (dt != null) return _dateShort.format(dt);
    } catch (_) {}
    return raw.length >= 10 ? raw.substring(5, 10).replaceAll('-', '/') : raw;
  }

  @override
  Widget build(BuildContext context) {
    final base = AppTypography.bodySmall.copyWith(color: t.textPrimary);
    final muted = AppTypography.bodySmall.copyWith(
      color: t.textMuted,
      fontStyle: FontStyle.italic,
    );

    String ni(dynamic v, {bool cur = false, bool hrs = false}) =>
        formatOrNaoInformado(v, isCurrency: cur, isHours: hrs);

    Widget cell(dynamic v,
            {bool cur = false, bool hrs = false, TextAlign align = TextAlign.right}) =>
        Text(
          v == null ? 'não informado' : ni(v, cur: cur, hrs: hrs),
          style: v == null ? muted : base,
          textAlign: align,
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        );

    final comissaoApresentadoraLabel = sessao.comissaoApresentadora == null
        ? 'não informado'
        : '${_currency.format(sessao.comissaoApresentadora)}'
            '${sessao.fimDeSemana ? ' (fds)' : ''}';

    return Container(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: t.hairline)),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x5,
        vertical: AppSpacing.x3,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 72,
            child: Text(_fmtData(sessao.data), style: base),
          ),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
            width: 120,
            child: Text(
              sessao.apresentadora ?? 'não informado',
              style: sessao.apresentadora == null ? muted : base,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 60, child: cell(sessao.horas, hrs: true)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 90, child: cell(sessao.gmv, cur: true)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 60, child: cell(sessao.pedidos)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 60, child: cell(sessao.views)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 60, child: cell(sessao.clicks)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(width: 90, child: cell(sessao.gmvPorHora, cur: true)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
              width: 100, child: cell(sessao.comissaoLivelab, cur: true)),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
            width: 110,
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    comissaoApresentadoraLabel,
                    style: sessao.comissaoApresentadora == null ? muted : base,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                if (sessao.fimDeSemana && sessao.comissaoApresentadora != null)
                  Padding(
                    padding: const EdgeInsets.only(left: AppSpacing.x1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.infoBg,
                        borderRadius: AppRadius.smR,
                      ),
                      child: Text(
                        'fds 2%',
                        style: AppTypography.caption
                            .copyWith(color: AppColors.info, fontSize: 10),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x4),
          SizedBox(
            width: 70,
            child: _SessaoStatusBadge(status: sessao.statusOperacional),
          ),
          const SizedBox(width: AppSpacing.x4),
          Expanded(
            child: Text(
              _buildProblemaAcao(sessao),
              style: AppTypography.caption.copyWith(color: t.textMuted),
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  String _buildProblemaAcao(SessaoLive s) {
    final parts = <String>[];
    if (s.problema != null && s.problema!.isNotEmpty) parts.add(s.problema!);
    if (s.proximaAcao != null && s.proximaAcao!.isNotEmpty) {
      parts.add('→ ${s.proximaAcao!}');
    }
    return parts.isEmpty ? '–' : parts.join(' ');
  }
}

// ---------------------------------------------------------------------------
// Badge de status de sessão
// ---------------------------------------------------------------------------
class _SessaoStatusBadge extends StatelessWidget {
  final String status;

  const _SessaoStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color bg;
    String label;
    switch (status) {
      case 'ok':
        color = AppColors.success;
        bg = AppColors.successBg;
        label = 'OK';
      case 'atencao':
        color = AppColors.warning;
        bg = AppColors.warningBg;
        label = 'Atenção';
      case 'critico':
        color = AppColors.danger;
        bg = AppColors.dangerBg;
        label = 'Crítico';
      default:
        color = AppColors.info;
        bg = AppColors.infoBg;
        label = 'Incompleto';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.fullR,
      ),
      child: Text(
        label,
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
          fontSize: 10,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Versão mobile — cards empilhados
// ---------------------------------------------------------------------------
class _SessoesCards extends StatelessWidget {
  final List<SessaoLive> sessoes;

  const _SessoesCards({required this.sessoes});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: sessoes.map((s) => _SessaoCard(sessao: s)).toList(),
    );
  }
}

class _SessaoCard extends StatelessWidget {
  final SessaoLive sessao;

  const _SessaoCard({required this.sessao});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;

    String fmtData(String? raw) {
      if (raw == null || raw.isEmpty) return '–';
      try {
        final dt = DateTime.tryParse(raw);
        if (dt != null) return _dateShort.format(dt);
      } catch (_) {}
      return raw.length >= 10 ? raw.substring(5, 10).replaceAll('-', '/') : raw;
    }

    Widget row(String label, dynamic value,
        {bool cur = false, bool hrs = false}) {
      final display = formatOrNaoInformado(value, isCurrency: cur, isHours: hrs);
      final isNull = value == null;
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.x2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: AppTypography.caption.copyWith(color: t.textMuted)),
            Text(
              display,
              style: isNull
                  ? AppTypography.caption.copyWith(
                      color: t.textMuted, fontStyle: FontStyle.italic)
                  : AppTypography.caption.copyWith(
                      color: t.textPrimary, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x5, vertical: AppSpacing.x2),
      padding: const EdgeInsets.all(AppSpacing.x4),
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: AppRadius.mdR,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                fmtData(sessao.data),
                style: AppTypography.label.copyWith(
                    color: t.textPrimary, fontWeight: FontWeight.w700),
              ),
              const SizedBox(width: AppSpacing.x3),
              if (sessao.apresentadora != null)
                Expanded(
                  child: Text(
                    sessao.apresentadora!,
                    style:
                        AppTypography.bodySmall.copyWith(color: t.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              const Spacer(),
              _SessaoStatusBadge(status: sessao.statusOperacional),
            ],
          ),
          const SizedBox(height: AppSpacing.x3),
          row('Horas', sessao.horas, hrs: true),
          row('GMV', sessao.gmv, cur: true),
          row('Pedidos', sessao.pedidos),
          row('Views', sessao.views),
          row('Cliques', sessao.clicks),
          row('GMV/h', sessao.gmvPorHora, cur: true),
          row('Com. LiveLab', sessao.comissaoLivelab, cur: true),
          _ComissaoApresentadoraRow(sessao: sessao),
          if (sessao.problema != null && sessao.problema!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.x2),
            Text(
              sessao.problema!,
              style: AppTypography.caption
                  .copyWith(color: AppColors.warning),
            ),
          ],
          if (sessao.proximaAcao != null &&
              sessao.proximaAcao!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.x1),
            Text(
              '→ ${sessao.proximaAcao!}',
              style: AppTypography.caption.copyWith(
                  color: t.textMuted, fontStyle: FontStyle.italic),
            ),
          ],
        ],
      ),
    );
  }
}

class _ComissaoApresentadoraRow extends StatelessWidget {
  final SessaoLive sessao;

  const _ComissaoApresentadoraRow({required this.sessao});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final isNull = sessao.comissaoApresentadora == null;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Com. Apresent.',
              style: AppTypography.caption.copyWith(color: t.textMuted)),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isNull
                    ? 'não informado'
                    : _currency.format(sessao.comissaoApresentadora),
                style: isNull
                    ? AppTypography.caption.copyWith(
                        color: t.textMuted, fontStyle: FontStyle.italic)
                    : AppTypography.caption.copyWith(
                        color: t.textPrimary, fontWeight: FontWeight.w600),
              ),
              if (!isNull && sessao.fimDeSemana) ...[
                const SizedBox(width: AppSpacing.x1),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.infoBg,
                    borderRadius: AppRadius.smR,
                  ),
                  child: Text(
                    'fds 2%',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.info,
                      fontSize: 10,
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
