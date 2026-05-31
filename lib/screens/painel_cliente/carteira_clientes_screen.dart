import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../routes/app_routes.dart';
import '../../providers/clientes_provider.dart';
import '../../models/cliente.dart';
import '../../design_system/design_system.dart';

class CarteiraClientesScreen extends ConsumerWidget {
  const CarteiraClientesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clientesAsync = ref.watch(clientesProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.carteiraClientes,
      eyebrow: 'Clientes',
      title: 'Carteira de Clientes',
      subtitle: 'Lista completa de clientes ativos e em negociação.',
      child: clientesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erro ao carregar clientes: $e'),
              const SizedBox(height: AppSpacing.x3),
              AppPrimaryButton(
                onPressed: () => ref.read(clientesProvider.notifier).refresh(),
                label: 'Tentar novamente',
              ),
            ],
          ),
        ),
        data: (clientes) => _CarteiraList(clientes: clientes),
      ),
    );
  }
}

class _CarteiraList extends StatefulWidget {
  final List<Cliente> clientes;
  const _CarteiraList({required this.clientes});

  @override
  State<_CarteiraList> createState() => _CarteiraListState();
}

class _CarteiraListState extends State<_CarteiraList> {
  String _filtroStatus = 'Todos';

  static const _statusOptions = [
    'Todos',
    'Negociação',
    'Enviado',
    'Ativo',
    'Inadimplente',
  ];

  static const _statusMap = {
    'Negociação': 'negociacao',
    'Enviado': 'enviado',
    'Ativo': 'ativo',
    'Inadimplente': 'inadimplente',
  };

  List<Cliente> get _clientesFiltrados {
    if (_filtroStatus == 'Todos') return widget.clientes;
    final apiStatus = _statusMap[_filtroStatus];
    return widget.clientes.where((c) => c.status == apiStatus).toList();
  }

  Color _statusColor(BuildContext context, String status) => switch (status) {
        'negociacao' => AppColors.warning,
        'enviado' => AppColors.info,
        'ativo' => AppColors.success,
        'inadimplente' => AppColors.danger,
        _ => context.colors.textMuted,
      };

  String _statusLabel(String status) => switch (status) {
        'negociacao' => 'Negociação',
        'enviado' => 'Enviado',
        'ativo' => 'Ativo',
        'inadimplente' => 'Inadimplente',
        _ => status,
      };

  @override
  Widget build(BuildContext context) {
    final clientes = _clientesFiltrados;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header bar with filter and count
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x6,
            vertical: AppSpacing.x3,
          ),
          decoration: BoxDecoration(
            color: context.colors.bgCard,
            border: Border(
              bottom: BorderSide(color: context.colors.borderSubtle, width: 1),
            ),
          ),
          child: Row(
            children: [
              // Total count chip
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.x3,
                  vertical: AppSpacing.x1,
                ),
                decoration: BoxDecoration(
                  color: context.colors.primarySoftBg,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '${clientes.length} cliente${clientes.length == 1 ? '' : 's'}',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              // Status filter dropdown
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Status:',
                    style: AppTypography.bodySmall.copyWith(
                      color: context.colors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.x2),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _filtroStatus,
                      style: AppTypography.bodySmall,
                      items: _statusOptions
                          .map((s) => DropdownMenuItem(
                                value: s,
                                child: Text(s,
                                    style: AppTypography.bodySmall),
                              ))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _filtroStatus = v ?? 'Todos'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Client list
        Expanded(
          child: clientes.isEmpty
              ? Center(
                  child: Text(
                    'Nenhum cliente encontrado.',
                    style: AppTypography.bodyMedium.copyWith(
                      color: context.colors.textMuted,
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.x4),
                  itemCount: clientes.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.x3),
                  itemBuilder: (context, index) {
                    final cliente = clientes[index];
                    return _ClienteCard(
                      cliente: cliente,
                      statusColor: _statusColor(context, cliente.status),
                      statusLabel: _statusLabel(cliente.status),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ClienteCard extends StatelessWidget {
  final Cliente cliente;
  final Color statusColor;
  final String statusLabel;

  const _ClienteCard({
    required this.cliente,
    required this.statusColor,
    required this.statusLabel,
  });

  @override
  Widget build(BuildContext context) {
    final localizacao = [
      if (cliente.cidade != null) cliente.cidade!,
      if (cliente.estado != null) cliente.estado!,
    ].join(', ');

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Status dot
          Container(
            width: 10,
            height: 10,
            margin: const EdgeInsets.only(right: AppSpacing.x3, top: 2),
            decoration: BoxDecoration(
              color: statusColor,
              shape: BoxShape.circle,
            ),
          ),
          // Main content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Name + status badge row
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        cliente.nome,
                        style: AppTypography.bodyLarge.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.x2),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.x2,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        border: Border.all(
                          color: statusColor.withValues(alpha: 0.35),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        statusLabel,
                        style: AppTypography.caption.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                // Secondary info row
                const SizedBox(height: AppSpacing.x1),
                Row(
                  children: [
                    if (localizacao.isNotEmpty) ...[
                      Text(
                        localizacao,
                        style: AppTypography.bodySmall.copyWith(
                          color: context.colors.textSecondary,
                        ),
                      ),
                      if (cliente.nicho != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.x2),
                          child: Text(
                            '·',
                            style: AppTypography.bodySmall.copyWith(
                              color: context.colors.textMuted,
                            ),
                          ),
                        ),
                    ],
                    if (cliente.nicho != null)
                      Expanded(
                        child: Text(
                          cliente.nicho!,
                          style: AppTypography.bodySmall.copyWith(
                            color: context.colors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          // Score chip
          const SizedBox(width: AppSpacing.x3),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.x2,
              vertical: AppSpacing.x1,
            ),
            decoration: BoxDecoration(
              color: context.colors.bgMuted,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: context.colors.borderSubtle),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${cliente.score}',
                  style: AppTypography.bodySmall.copyWith(
                    fontWeight: FontWeight.w700,
                    color: context.colors.textSecondary,
                  ),
                ),
                Text(
                  'score',
                  style: AppTypography.caption.copyWith(
                    fontSize: 9,
                    color: context.colors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
