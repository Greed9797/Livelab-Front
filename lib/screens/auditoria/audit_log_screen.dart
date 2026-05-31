import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/audit_log_entry.dart';
import '../../providers/audit_log_provider.dart';
import '../../routes/app_routes.dart';

class AuditLogScreen extends ConsumerStatefulWidget {
  final bool embedded;
  const AuditLogScreen({super.key, this.embedded = false});

  @override
  ConsumerState<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends ConsumerState<AuditLogScreen> {
  static const _commonActions = <String>[
    'cliente.create',
    'cliente.update',
    'cliente.delete',
    'contrato.create',
    'contrato.assinar',
    'contrato.cancelar',
    'usuario.invite',
    'usuario.update',
    'usuario.disable',
    'usuario.reset_password',
    'cabine.create',
    'cabine.update',
    'cabine.delete',
    'live.start',
    'live.end',
    'auth.login',
    'auth.logout',
    'auth.refresh',
  ];

  static const _entityTypes = <String>[
    'cliente',
    'contrato',
    'cabine',
    'live',
    'usuario',
    'apresentadora',
    'custo',
    'recomendacao',
    'lead',
    'pacote',
  ];

  @override
  Widget build(BuildContext context) {
    final filtros = ref.watch(auditLogFiltrosProvider);
    final pageAsync = ref.watch(auditLogProvider);

    final content = SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FiltrosCard(
            filtros: filtros,
            actions: _commonActions,
            entities: _entityTypes,
          ),
          const SizedBox(height: AppSpacing.x6),
          pageAsync.when(
            loading: () => const _AuditLogSkeleton(),
            error: (e, _) => _ErrorBox(message: '$e', onRetry: () {
              ref.read(auditLogProvider.notifier).refresh();
            }),
            data: (page) => page.itens.isEmpty
                ? const _EmptyState()
                : _AuditLogTable(page: page),
          ),
        ],
      ),
    );

    if (widget.embedded) return content;

    return AppScreenScaffold(
      currentRoute: AppRoutes.auditLog,
      eyebrow: 'AUDITORIA',
      title: 'Log de ações',
      subtitle: 'Histórico de ações sensíveis com autor, IP e contexto.',
      actions: [
        AppSecondaryButton(
          label: 'Atualizar',
          icon: PhosphorIcons.arrowsClockwise(),
          onPressed: () => ref.read(auditLogProvider.notifier).refresh(),
        ),
      ],
      child: content,
    );
  }
}

// ─── Filtros ──────────────────────────────────────────────────

class _FiltrosCard extends ConsumerStatefulWidget {
  final AuditLogFiltros filtros;
  final List<String> actions;
  final List<String> entities;

  const _FiltrosCard({
    required this.filtros,
    required this.actions,
    required this.entities,
  });

  @override
  ConsumerState<_FiltrosCard> createState() => _FiltrosCardState();
}

class _FiltrosCardState extends ConsumerState<_FiltrosCard> {
  late final TextEditingController _userIdCtrl;

  @override
  void initState() {
    super.initState();
    _userIdCtrl = TextEditingController(text: widget.filtros.userId ?? '');
  }

  @override
  void dispose() {
    _userIdCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtros = widget.filtros;
    final notifier = ref.read(auditLogFiltrosProvider.notifier);
    final dateFmt = DateFormat('dd/MM/yyyy', 'pt_BR');

    return AppCard(
      child: Wrap(
        spacing: AppSpacing.x4,
        runSpacing: AppSpacing.x4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 220,
            child: DropdownButtonFormField<String?>(
              initialValue: filtros.action,
              decoration: const InputDecoration(
                labelText: 'Ação',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: <DropdownMenuItem<String?>>[
                const DropdownMenuItem(value: null, child: Text('Todas')),
                ...widget.actions.map(
                  (a) => DropdownMenuItem(value: a, child: Text(a)),
                ),
              ],
              onChanged: notifier.setAction,
            ),
          ),
          SizedBox(
            width: 200,
            child: DropdownButtonFormField<String?>(
              initialValue: filtros.entityType,
              decoration: const InputDecoration(
                labelText: 'Entidade',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              items: <DropdownMenuItem<String?>>[
                const DropdownMenuItem(value: null, child: Text('Todas')),
                ...widget.entities.map(
                  (e) => DropdownMenuItem(value: e, child: Text(e)),
                ),
              ],
              onChanged: notifier.setEntityType,
            ),
          ),
          SizedBox(
            width: 220,
            child: InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Desde',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    filtros.desde == null
                        ? 'Qualquer data'
                        : dateFmt.format(filtros.desde!),
                    style: AppTypography.bodyMedium,
                  ),
                  Row(
                    children: [
                      IconButton(
                        tooltip: 'Selecionar data',
                        icon: Icon(PhosphorIcons.calendarBlank()),
                        onPressed: () async {
                          final now = DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: filtros.desde ?? now,
                            firstDate: DateTime(now.year - 3),
                            lastDate: now,
                          );
                          if (picked != null) {
                            notifier.setDesde(picked);
                          }
                        },
                      ),
                      if (filtros.desde != null)
                        IconButton(
                          tooltip: 'Limpar',
                          icon: Icon(PhosphorIcons.x()),
                          onPressed: () => notifier.setDesde(null),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 260,
            child: TextField(
              controller: _userIdCtrl,
              decoration: InputDecoration(
                labelText: 'User ID (UUID)',
                hintText: 'opcional',
                border: const OutlineInputBorder(),
                isDense: true,
                suffixIcon: IconButton(
                  icon: Icon(PhosphorIcons.magnifyingGlass()),
                  onPressed: () {
                    final raw = _userIdCtrl.text.trim();
                    notifier.setUserId(raw.isEmpty ? null : raw);
                  },
                ),
              ),
              onSubmitted: (v) {
                final raw = v.trim();
                notifier.setUserId(raw.isEmpty ? null : raw);
              },
            ),
          ),
          AppSecondaryButton(
            label: 'Limpar filtros',
            icon: PhosphorIcons.broom(),
            onPressed: () {
              notifier.reset();
              _userIdCtrl.clear();
            },
          ),
        ],
      ),
    );
  }
}

// ─── Tabela ───────────────────────────────────────────────────

class _AuditLogTable extends ConsumerWidget {
  final AuditLogPage page;

  const _AuditLogTable({required this.page});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x6,
              vertical: AppSpacing.x4,
            ),
            child: Row(
              children: [
                Text(
                  '${page.total} eventos',
                  style: AppTypography.bodyLarge.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                _Paginator(
                  pagina: page.pagina,
                  totalPaginas: page.totalPaginas,
                  onChanged: (p) => ref
                      .read(auditLogFiltrosProvider.notifier)
                      .setPagina(p),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: page.itens.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, idx) => _AuditLogRow(entry: page.itens[idx]),
          ),
        ],
      ),
    );
  }
}

class _Paginator extends StatelessWidget {
  final int pagina;
  final int totalPaginas;
  final ValueChanged<int> onChanged;

  const _Paginator({
    required this.pagina,
    required this.totalPaginas,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Página anterior',
          icon: Icon(PhosphorIcons.caretLeft()),
          onPressed: pagina > 1 ? () => onChanged(pagina - 1) : null,
        ),
        Text(
          'Página $pagina de $totalPaginas',
          style: AppTypography.bodySmall,
        ),
        IconButton(
          tooltip: 'Próxima página',
          icon: Icon(PhosphorIcons.caretRight()),
          onPressed:
              pagina < totalPaginas ? () => onChanged(pagina + 1) : null,
        ),
      ],
    );
  }
}

class _AuditLogRow extends StatefulWidget {
  final AuditLogEntry entry;

  const _AuditLogRow({required this.entry});

  @override
  State<_AuditLogRow> createState() => _AuditLogRowState();
}

class _AuditLogRowState extends State<_AuditLogRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm:ss', 'pt_BR');
    final hasMeta = entry.metadata.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x6,
        vertical: AppSpacing.x4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 160,
                child: Text(
                  dateFmt.format(entry.criadoEm),
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              Expanded(
                flex: 3,
                child: _AutorBlock(entry: entry),
              ),
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.x2,
                  ),
                  child: _ActionChip(action: entry.action),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  entry.entityType == null
                      ? '—'
                      : '${entry.entityType}${entry.entityId != null ? '\n${_short(entry.entityId!)}' : ''}',
                  style: AppTypography.bodySmall,
                ),
              ),
              SizedBox(
                width: 140,
                child: Text(
                  entry.ip ?? '—',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textMuted,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              SizedBox(
                width: 40,
                child: hasMeta
                    ? IconButton(
                        tooltip:
                            _expanded ? 'Ocultar contexto' : 'Mostrar contexto',
                        icon: Icon(
                          _expanded
                              ? PhosphorIcons.caretUp()
                              : PhosphorIcons.caretDown(),
                          size: 18,
                        ),
                        onPressed: () => setState(() => _expanded = !_expanded),
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
          if (_expanded && hasMeta)
            Padding(
              padding: const EdgeInsets.only(
                top: AppSpacing.x2,
                left: 160,
              ),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.x4),
                decoration: BoxDecoration(
                  color: AppColors.bgMuted,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: SelectableText(
                  const JsonEncoder.withIndent('  ').convert(entry.metadata),
                  style: AppTypography.caption.copyWith(
                    fontFamily: 'monospace',
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  static String _short(String uuid) {
    if (uuid.length <= 8) return uuid;
    return '${uuid.substring(0, 8)}…';
  }
}

class _AutorBlock extends StatelessWidget {
  final AuditLogEntry entry;
  const _AutorBlock({required this.entry});

  @override
  Widget build(BuildContext context) {
    final nome = entry.autorNome ?? 'Sistema';
    final inicial = nome.trim().isEmpty ? '?' : nome.trim()[0].toUpperCase();
    return Row(
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: AppColors.primary.withValues(alpha: 0.12),
          child: Text(
            inicial,
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.x2),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                nome,
                style: AppTypography.bodyMedium.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (entry.autorEmail != null)
                Text(
                  entry.autorEmail!,
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textMuted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String action;
  const _ActionChip({required this.action});

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(action);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x2,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Text(
        action,
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  static Color _colorFor(String action) {
    if (action.endsWith('.delete') || action.endsWith('.disable')) {
      return AppColors.danger;
    }
    if (action.endsWith('.create') || action.endsWith('.invite') ||
        action.endsWith('.start')) {
      return AppColors.success;
    }
    if (action.endsWith('.update') ||
        action.endsWith('.assinar') ||
        action.endsWith('.refresh')) {
      return AppColors.info;
    }
    if (action.startsWith('auth.')) {
      return AppColors.warning;
    }
    return AppColors.textSecondary;
  }
}

// ─── Empty / Skeleton / Error ────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          vertical: AppSpacing.x12,
          horizontal: AppSpacing.x6,
        ),
        child: Column(
          children: [
            Icon(
              PhosphorIcons.fileMagnifyingGlass(),
              size: 40,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: AppSpacing.x4),
            const Text(
              'Nenhum evento encontrado',
              style: AppTypography.h3,
            ),
            const SizedBox(height: AppSpacing.x1),
            Text(
              'Ajuste os filtros para visualizar mais registros.',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _AuditLogSkeleton extends StatelessWidget {
  const _AuditLogSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: List.generate(
          6,
          (i) => Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.x2),
            child: Container(
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.bgMuted,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorBox({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(PhosphorIcons.warning(), color: AppColors.danger),
              const SizedBox(width: AppSpacing.x2),
              const Text('Falha ao carregar audit log',
                  style: AppTypography.bodyLarge),
            ],
          ),
          const SizedBox(height: AppSpacing.x2),
          Text(message, style: AppTypography.bodySmall),
          const SizedBox(height: AppSpacing.x4),
          AppPrimaryButton(
            label: 'Tentar novamente',
            icon: Icons.refresh_rounded,
            onPressed: onRetry,
          ),
        ],
      ),
    );
  }
}
