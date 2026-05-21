import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/excelencia_provider.dart';
import '../../models/excelencia.dart' show ExcelenciaData;
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../design_system/design_system.dart';

class ExcelenciaScreen extends ConsumerWidget {
  const ExcelenciaScreen({super.key});

  static const _taxaFranquia = 29000.0;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final excelenciaAsync = ref.watch(excelenciaProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.excelencia,
      title: 'Programa de Excelência',
      eyebrow: 'ROI & saúde da franquia',
      titleSerif: true,
      subtitle:
          'Um diagnóstico vivo da sua operação. O que está funcionando, o que precisa de atenção e quanto tempo até o payback.',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Atualizar',
          onPressed: () => ref.read(excelenciaProvider.notifier).refresh(),
          color: context.colors.textSecondary,
        ),
      ],
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.x6),
        child: excelenciaAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(
                ApiService.extractErrorMessage(e),
                style: AppTypography.caption.copyWith(color: context.colors.textSecondary),
              ),
              const SizedBox(height: AppSpacing.x3),
              AppSecondaryButton(
                onPressed: () => ref.read(excelenciaProvider.notifier).refresh(),
                label: 'Tentar novamente',
              ),
            ]),
          ),
          data: (data) => _ExcelenciaContent(data: data, taxaFranquia: _taxaFranquia),
        ),
      ),
    );
  }
}

class _ExcelenciaContent extends StatelessWidget {
  final ExcelenciaData data;
  final double taxaFranquia;
  const _ExcelenciaContent({required this.data, required this.taxaFranquia});

  @override
  Widget build(BuildContext context) {
    final mesesROI = data.fatMesAtual > 0 ? taxaFranquia / data.fatMesAtual : 0.0;
    final crescendo = data.crescimentoPct >= 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ScoreHeroCard(score: data.score),
        const SizedBox(height: AppSpacing.x6),
        const AppSectionHeader(
          title: 'Métricas Operacionais',
          subtitle: 'Retenção, crescimento, produtividade e churn.',
        ),
        LayoutBuilder(
          builder: (context, constraints) {
            final isDesktop = constraints.maxWidth >= AppBreakpoints.tablet;
            return isDesktop
                ? Row(children: [
                    Expanded(child: MetricCardRebrand(icon: Icons.favorite_border, label: 'RETENÇÃO', value: '${data.taxaRetencao}%', toneColor: AppColors.success, sub: '${data.ativos} ativos', target: 'Meta: 90%')),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(child: MetricCardRebrand(icon: Icons.trending_up, label: 'CRESCIMENTO', value: '${crescendo ? '+' : ''}${data.crescimentoPct}%', toneColor: crescendo ? AppColors.success : AppColors.danger, sub: 'vs. mês anterior')),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(child: MetricCardRebrand(icon: Icons.bolt_outlined, label: 'PRODUTIVIDADE', value: '${data.ativos}', toneColor: AppColors.primary, sub: 'carteira ativa')),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(child: MetricCardRebrand(icon: Icons.remove_circle_outline, label: 'CHURN', value: '${100 - data.taxaRetencao}%', toneColor: AppColors.danger, sub: '${data.cancelados} cancelamentos')),
                  ])
                : Column(children: [
                    MetricCardRebrand(icon: Icons.favorite_border, label: 'RETENÇÃO', value: '${data.taxaRetencao}%', toneColor: AppColors.success, sub: '${data.ativos} ativos', target: 'Meta: 90%'),
                    const SizedBox(height: AppSpacing.x3),
                    MetricCardRebrand(icon: Icons.trending_up, label: 'CRESCIMENTO', value: '${crescendo ? '+' : ''}${data.crescimentoPct}%', toneColor: crescendo ? AppColors.success : AppColors.danger, sub: 'vs. mês anterior'),
                    const SizedBox(height: AppSpacing.x3),
                    MetricCardRebrand(icon: Icons.bolt_outlined, label: 'PRODUTIVIDADE', value: '${data.ativos}', toneColor: AppColors.primary, sub: 'carteira ativa'),
                    const SizedBox(height: AppSpacing.x3),
                    MetricCardRebrand(icon: Icons.remove_circle_outline, label: 'CHURN', value: '${100 - data.taxaRetencao}%', toneColor: AppColors.danger, sub: '${data.cancelados} cancelamentos'),
                  ]);
          },
        ),
        const SizedBox(height: AppSpacing.x6),
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 4,
                      height: 46,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'RETORNO SOBRE INVESTIMENTO (ROI)',
                            style: AppTypography.caption.copyWith(
                              color: context.colors.textMuted,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            mesesROI > 0
                                ? 'Payback em ${mesesROI.toStringAsFixed(1)} meses'
                                : 'Configure sua taxa de franquia',
                            style: AppTypography.h3,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Taxa R\$ ${taxaFranquia.toStringAsFixed(0)} ÷ faturamento líquido R\$ ${data.fatMesAtual.toStringAsFixed(0)}/mês',
                            style: AppTypography.caption
                                .copyWith(color: context.colors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x3),
                    AppPrimaryButton(
                      label: 'Configurar agora',
                      onPressed: null, // Feature pending
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.x5),
                Divider(height: 1, color: context.colors.borderSubtle),
                const SizedBox(height: AppSpacing.x4),
                LayoutBuilder(
                  builder: (ctx, c) {
                    final wide = c.maxWidth >= 640;
                    final boxes = [
                      const _RoiBox(
                        label: 'Investimento inicial',
                        value: 'R\$ 29.000',
                        sub: 'Taxa de franquia',
                      ),
                      _RoiBox(
                        label: 'Payback estimado',
                        value: mesesROI > 0
                            ? '${mesesROI.toStringAsFixed(1)}m'
                            : '—',
                        sub: mesesROI > 0
                            ? 'meses até o retorno'
                            : 'Aguardando configuração',
                        dimmed: mesesROI <= 0,
                      ),
                      _RoiBox(
                        label: 'Break-even',
                        value: data.fatMesAtual > 0
                            ? 'R\$ ${(taxaFranquia / 12).toStringAsFixed(0)}'
                            : '—',
                        sub: data.fatMesAtual > 0
                            ? 'receita mensal alvo'
                            : 'Depende do faturamento líquido',
                        dimmed: data.fatMesAtual <= 0,
                      ),
                    ];
                    if (!wide) {
                      return Column(
                        children: [
                          for (var i = 0; i < boxes.length; i++) ...[
                            if (i > 0) const SizedBox(height: AppSpacing.x3),
                            boxes[i],
                          ],
                        ],
                      );
                    }
                    return IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var i = 0; i < boxes.length; i++) ...[
                            if (i > 0) const SizedBox(width: AppSpacing.x3),
                            Expanded(child: boxes[i]),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.x6),
        AppCard(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome,
                        color: AppColors.primary, size: 20),
                    const SizedBox(width: AppSpacing.x2),
                    Text('Próximas ações sugeridas',
                        style: AppTypography.h3),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Prioridades para subir 10 pontos no score este mês',
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textSecondary),
                ),
                const SizedBox(height: AppSpacing.x4),
                const _ActionItem(
                  number: 1,
                  text: 'Ativar 3 cabines ociosas',
                  desc:
                      'Você tem cabines livres. Ativar metade adiciona ~R\$ 15k ao GMV projetado.',
                  gain: '+6 pts',
                ),
                const _ActionItem(
                  number: 2,
                  text: 'Configurar taxa de franquia',
                  desc:
                      'Sem isso o payback e ROI ficam indisponíveis no dashboard.',
                  gain: '+2 pts',
                ),
                const _ActionItem(
                  number: 3,
                  text: 'Captar 3 novos clientes no nicho âncora',
                  desc:
                      'Seu cliente âncora converte 100% — replique o perfil.',
                  gain: '+2 pts',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.x6),
        const _RankingApresentadorasSection(),
      ],
    );
  }
}

// ─── Score hero ───────────────────────────────────────────────────────────────

class _ScoreHeroCard extends StatelessWidget {
  final int score;
  const _ScoreHeroCard({required this.score});

  @override
  Widget build(BuildContext context) {
    final int diff = 48 - score;
    final String diffText = diff > 0
        ? '$diff pontos abaixo do alvo da rede (48)'
        : diff < 0
            ? '${diff.abs()} pontos acima do alvo da rede (48)'
            : 'no alvo da rede (48)';

    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x5),
        child: Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned(
              right: -60,
              top: -60,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      context.colors.primarySoftBg,
                      context.colors.primarySoftBg.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Score de Excelência',
                              style: AppTypography.caption.copyWith(
                                color: context.colors.textMuted,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.2,
                              )),
                          const SizedBox(height: AppSpacing.x1),
                          Text.rich(
                            TextSpan(children: [
                              TextSpan(
                                text: '$score',
                                style: AppTypography.h1.copyWith(
                                  fontSize: 56,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -2,
                                  height: 1,
                                ),
                              ),
                              TextSpan(
                                text: '/100',
                                style: AppTypography.h3.copyWith(
                                  color: context.colors.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ]),
                          ),
                          const SizedBox(height: AppSpacing.x2),
                          Row(
                            children: [
                              AppBadge(
                                label: score >= 80
                                    ? 'Excelência'
                                    : score >= 50
                                        ? 'Operando'
                                        : 'Iniciando',
                                type: score >= 80
                                    ? AppBadgeType.success
                                    : score >= 50
                                        ? AppBadgeType.neutral
                                        : AppBadgeType.warning,
                                showDot: true,
                              ),
                              const SizedBox(width: AppSpacing.x2),
                              Flexible(
                                child: Text(
                                  diffText,
                                  style: AppTypography.caption.copyWith(
                                    color: context.colors.textMuted,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x4),
                    ScoreRing(score: score, size: 130),
                  ],
                ),
                const SizedBox(height: AppSpacing.x4),
                Container(
                  height: 12,
                  decoration: BoxDecoration(
                    color: context.colors.bgMuted,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: FractionallySizedBox(
                    widthFactor: (score.clamp(0, 100)) / 100,
                    alignment: Alignment.centerLeft,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryLight],
                        ),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.x2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('0 · iniciante',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted)),
                    Text('50 · operando',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted)),
                    Text('80 · excelência',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted)),
                    Text('100 · benchmark',
                        style: AppTypography.caption
                            .copyWith(color: context.colors.textMuted)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── RoiBox ──────────────────────────────────────────────────────────────────

class _RoiBox extends StatelessWidget {
  final String label;
  final String value;
  final String sub;
  final bool dimmed;

  const _RoiBox({
    required this.label,
    required this.value,
    required this.sub,
    this.dimmed = false,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: dimmed ? 0.7 : 1.0,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x4, vertical: AppSpacing.x4),
        decoration: BoxDecoration(
          color: dimmed ? context.colors.bgMuted : context.colors.primarySoftBg,
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label.toUpperCase(),
              style: AppTypography.caption.copyWith(
                color: context.colors.textMuted,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.2,
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: AppTypography.h3.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              sub,
              style: AppTypography.caption
                  .copyWith(color: context.colors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionItem extends StatelessWidget {
  final int number;
  final String text;
  final String desc;
  final String gain;

  const _ActionItem({
    required this.number,
    required this.text,
    required this.desc,
    required this.gain,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.x3),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppColors.hairline, width: 1),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: context.colors.primarySoftBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              '$number',
              style: AppTypography.caption.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: AppTypography.bodyMedium
                      .copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          AppBadge(label: gain, type: AppBadgeType.success),
          const SizedBox(width: AppSpacing.x2),
          AppGhostButton(
            label: 'Abrir',
            icon: Icons.arrow_forward,
            onPressed: null, // Feature pending
          ),
        ],
      ),
    );
  }
}

// ─── Ranking de Apresentadoras ────────────────────────────────────────────────

class _RankingApresentadorasSection extends ConsumerWidget {
  const _RankingApresentadorasSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rankingAsync = ref.watch(rankingApresentadorasProvider(null));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AppSectionHeader(
          title: 'Ranking de Apresentadoras',
          subtitle: 'GMV acumulado no mês · todas as ativas',
        ),
        const SizedBox(height: AppSpacing.x3),
        AppCard(
          child: rankingAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(AppSpacing.x6),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.all(AppSpacing.x5),
              child: Text(
                'Erro ao carregar ranking',
                style: AppTypography.caption
                    .copyWith(color: context.colors.textSecondary),
              ),
            ),
            data: (items) {
              if (items.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(AppSpacing.x5),
                  child: Text(
                    'Nenhuma apresentadora ativa encontrada.',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted),
                  ),
                );
              }
              return Column(
                children: [
                  for (var i = 0; i < items.length; i++)
                    _RankingRow(item: items[i], isLast: i == items.length - 1),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _RankingRow extends StatelessWidget {
  final RankingApresentadoraItem item;
  final bool isLast;

  const _RankingRow({required this.item, this.isLast = false});

  static const _medalColors = {
    1: Color(0xFFFFB800),
    2: Color(0xFF9E9E9E),
    3: Color(0xFFCD7F32),
  };

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.compactCurrency(locale: 'pt_BR', symbol: 'R\$');
    final fmtFull = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);
    final posicao = item.posicao;
    final medalColor = _medalColors[posicao];
    final pct = item.pctMeta;
    final metaAtingida = pct != null && pct >= 100;

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4, vertical: AppSpacing.x3),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(color: context.colors.borderSubtle, width: 1),
              ),
      ),
      child: Row(
        children: [
          // Position badge
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: medalColor != null
                  ? medalColor.withOpacity(0.15)
                  : context.colors.bgMuted,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Text(
              medalColor != null ? _medalEmoji(posicao) : '$posicao',
              style: AppTypography.caption.copyWith(
                color: medalColor ?? context.colors.textMuted,
                fontWeight: FontWeight.w700,
                fontSize: medalColor != null ? 16 : 13,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          // Name + meta bar
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.nome,
                        style: AppTypography.bodyMedium
                            .copyWith(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (metaAtingida) ...[
                      const SizedBox(width: AppSpacing.x2),
                      AppBadge(label: 'Meta ✓', type: AppBadgeType.success),
                    ],
                  ],
                ),
                if (pct != null) ...[
                  const SizedBox(height: 4),
                  LayoutBuilder(
                    builder: (_, c) => Stack(
                      children: [
                        Container(
                          height: 4,
                          width: c.maxWidth,
                          decoration: BoxDecoration(
                            color: context.colors.bgMuted,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                        ),
                        Container(
                          height: 4,
                          width: c.maxWidth * (pct / 100).clamp(0.0, 1.0),
                          decoration: BoxDecoration(
                            color: metaAtingida
                                ? AppColors.success
                                : AppColors.primary,
                            borderRadius:
                                BorderRadius.circular(AppRadius.full),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${pct.toStringAsFixed(0)}% da meta · ${item.totalLives} live${item.totalLives != 1 ? 's' : ''}',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted, fontSize: 10),
                  ),
                ] else
                  Text(
                    '${item.totalLives} live${item.totalLives != 1 ? 's' : ''} · sem meta definida',
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted, fontSize: 10),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          // GMV value
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                fmt.format(item.gmvTotal),
                style: AppTypography.bodyMedium.copyWith(
                  fontWeight: FontWeight.w700,
                  color: context.colors.textPrimary,
                ),
              ),
              if (item.gmvMeta > 0)
                Text(
                  'meta ${fmtFull.format(item.gmvMeta)}',
                  style: AppTypography.caption
                      .copyWith(color: context.colors.textMuted, fontSize: 10),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _medalEmoji(int pos) => switch (pos) {
        1 => '🥇',
        2 => '🥈',
        3 => '🥉',
        _ => '$pos',
      };
}
