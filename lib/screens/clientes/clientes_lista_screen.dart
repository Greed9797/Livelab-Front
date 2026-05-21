import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/cliente.dart';
import '../../providers/clientes_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/app_scaffold.dart';
import '../../widgets/skeleton_list.dart';
import '../usuarios/criar_usuario_dialog.dart';

class ClientesListaScreen extends ConsumerStatefulWidget {
  const ClientesListaScreen({super.key});

  @override
  ConsumerState<ClientesListaScreen> createState() =>
      _ClientesListaScreenState();
}

class _ClientesListaScreenState extends ConsumerState<ClientesListaScreen> {
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Cliente> _applyFilter(List<Cliente> all) {
    const validStatuses = {'ativo', 'onboarding', 'inadimplente'};
    final filtered =
        all.where((c) => validStatuses.contains(c.status)).toList();
    if (_searchQuery.isEmpty) return filtered;
    final q = _searchQuery.toLowerCase();
    return filtered
        .where((c) =>
            c.nome.toLowerCase().contains(q) ||
            (c.email?.toLowerCase().contains(q) ?? false) ||
            c.celular.contains(q))
        .toList();
  }

  Future<void> _confirmDelete(Cliente cliente) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        title: Text(
          'Excluir cliente',
          style: AppTypography.h3.copyWith(color: AppColors.textPrimary),
        ),
        content: Text(
          'Tem certeza que deseja excluir "${cliente.nome}"? Esta ação não pode ser desfeita.',
          style:
              AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Cancelar',
              style: AppTypography.label.copyWith(color: AppColors.textMuted),
            ),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(
              'Excluir',
              style: AppTypography.label.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await ref.read(clientesProvider.notifier).deletar(cliente.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cliente "${cliente.nome}" removido com sucesso.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ApiService.extractErrorMessage(e)),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  void _abrirCriarLogin() {
    showDialog(
      context: context,
      builder: (_) => const CriarUsuarioDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final clientesAsync = ref.watch(clientesProvider);

    return AppScaffold(
      currentRoute: AppRoutes.clientes,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Header(onNovoCliente: _abrirCriarLogin),
          _SearchBar(
            controller: _searchCtrl,
            onChanged: (v) => setState(() => _searchQuery = v),
          ),
          const SizedBox(height: AppSpacing.x4),
          Expanded(
            child: clientesAsync.when(
              loading: () => const _ClientesListaSkeleton(),
              error: (e, _) => _ClientesListaError(
                message: ApiService.extractErrorMessage(e),
                onRetry: () =>
                    ref.read(clientesProvider.notifier).refresh(),
              ),
              data: (todos) {
                final clientes = _applyFilter(todos);
                if (clientes.isEmpty) {
                  return _EmptyState(hasQuery: _searchQuery.isNotEmpty);
                }
                return _ClientesTable(
                  clientes: clientes,
                  onDelete: _confirmDelete,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

class _Header extends StatelessWidget {
  const _Header({required this.onNovoCliente});

  final VoidCallback onNovoCliente;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.x6,
        AppSpacing.x6,
        AppSpacing.x6,
        AppSpacing.x4,
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Clientes',
                style:
                    AppTypography.h2.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: 2),
              Text(
                'Clientes-parceiros contratados',
                style: AppTypography.bodySmall
                    .copyWith(color: AppColors.textMuted),
              ),
            ],
          ),
          const Spacer(),
          FilledButton.icon(
            onPressed: onNovoCliente,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.x4,
                vertical: AppSpacing.x3,
              ),
            ),
            icon: PhosphorIcon(
              PhosphorIcons.plus(PhosphorIconsStyle.bold),
              size: 16,
              color: Colors.white,
            ),
            label: Text(
              'Novo cliente',
              style:
                  AppTypography.label.copyWith(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Search Bar
// ---------------------------------------------------------------------------

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.x6),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: AppTypography.bodyMedium
            .copyWith(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Buscar por nome, email ou celular…',
          hintStyle: AppTypography.bodyMedium
              .copyWith(color: AppColors.textPlaceholder),
          prefixIcon: PhosphorIcon(
            PhosphorIcons.magnifyingGlass(PhosphorIconsStyle.regular),
            size: 18,
            color: AppColors.textMuted,
          ),
          filled: true,
          fillColor: AppColors.bgInput,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.x4,
            vertical: AppSpacing.x3,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

class _ClientesTable extends StatelessWidget {
  const _ClientesTable({
    required this.clientes,
    required this.onDelete,
  });

  final List<Cliente> clientes;
  final void Function(Cliente) onDelete;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x6),
      child: Material(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        elevation: 0,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.borderLight),
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: DataTable(
              headingRowColor:
                  WidgetStateProperty.all(AppColors.bgMuted),
              headingTextStyle: AppTypography.label.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
              dataTextStyle: AppTypography.bodySmall
                  .copyWith(color: AppColors.textPrimary),
              columnSpacing: AppSpacing.x6,
              horizontalMargin: AppSpacing.x4,
              dividerThickness: 1,
              columns: const [
                DataColumn(label: Text('Nome')),
                DataColumn(label: Text('GMV Mês')),
                DataColumn(label: Text('Lives')),
                DataColumn(label: Text('Apresentadoras')),
                DataColumn(label: Text('Status')),
                DataColumn(label: Text('Ações')),
              ],
              rows: clientes.map((c) => _buildRow(c)).toList(),
            ),
          ),
        ),
      ),
    );
  }

  DataRow _buildRow(Cliente cliente) {
    final gmvFmt = cliente.gmvMes >= 1000
        ? 'R\$ ${(cliente.gmvMes / 1000).toStringAsFixed(1)}k'
        : 'R\$ ${cliente.gmvMes.toStringAsFixed(0)}';

    return DataRow(
      cells: [
        DataCell(
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                cliente.nome,
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (cliente.email != null)
                Text(
                  cliente.email!,
                  style: AppTypography.caption
                      .copyWith(color: AppColors.textMuted),
                ),
            ],
          ),
        ),
        DataCell(Text(
          cliente.gmvMes > 0 ? gmvFmt : '—',
          style: AppTypography.bodySmall.copyWith(
            color: cliente.gmvMes > 0
                ? AppColors.success
                : AppColors.textMuted,
            fontWeight: FontWeight.w600,
          ),
        )),
        DataCell(Text(
          cliente.totalLivesMes > 0
              ? '${cliente.totalLivesMes}'
              : '—',
          style: AppTypography.bodySmall
              .copyWith(color: AppColors.textSecondary),
        )),
        DataCell(_ApresentadorasPills(nomes: cliente.apresentadorasNomes)),
        DataCell(_StatusBadge(status: cliente.status)),
        DataCell(_AcoesCell(
          cliente: cliente,
          onDelete: onDelete,
        )),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  static (String, Color, Color) _resolve(String status) {
    switch (status) {
      case 'ativo':
        return ('Ativo', AppColors.success, AppColors.successBg);
      case 'onboarding':
        return ('Onboarding', AppColors.info, AppColors.infoBg);
      case 'inadimplente':
        return ('Inadimplente', AppColors.danger, AppColors.dangerBg);
      default:
        return (status, AppColors.textMuted, AppColors.bgMuted);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (label, fg, bg) = _resolve(status);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x2,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label,
        style: AppTypography.caption.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Apresentadoras Pills
// ---------------------------------------------------------------------------

class _ApresentadorasPills extends StatelessWidget {
  const _ApresentadorasPills({required this.nomes});
  final List<String> nomes;

  @override
  Widget build(BuildContext context) {
    if (nomes.isEmpty) {
      return Text('—',
          style: AppTypography.caption.copyWith(color: AppColors.textMuted));
    }
    return Wrap(
      spacing: 4,
      runSpacing: 2,
      children: nomes.take(3).map((nome) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.primarySoftBg,
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          child: Text(
            nome.split(' ').first,
            style: AppTypography.caption.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      }).toList()
        ..addAll(nomes.length > 3
            ? [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.bgMuted,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    '+${nomes.length - 3}',
                    style: AppTypography.caption
                        .copyWith(color: AppColors.textMuted),
                  ),
                ),
              ]
            : []),
    );
  }
}

// ---------------------------------------------------------------------------
// Ações Cell
// ---------------------------------------------------------------------------

class _AcoesCell extends StatelessWidget {
  const _AcoesCell({required this.cliente, required this.onDelete});

  final Cliente cliente;
  final void Function(Cliente) onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        onTap: () => onDelete(cliente),
        child: Tooltip(
          message: 'Excluir cliente',
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x2),
            child: PhosphorIcon(
              PhosphorIcons.trash(PhosphorIconsStyle.regular),
              size: 18,
              color: AppColors.danger,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(
            PhosphorIcons.usersThree(PhosphorIconsStyle.thin),
            size: 64,
            color: AppColors.textMuted,
          ),
          const SizedBox(height: AppSpacing.x4),
          Text(
            hasQuery
                ? 'Nenhum cliente encontrado para esta busca'
                : 'Nenhum cliente cadastrado ainda',
            style: AppTypography.bodyLarge
                .copyWith(color: AppColors.textSecondary),
          ),
          if (!hasQuery) ...[
            const SizedBox(height: AppSpacing.x2),
            Text(
              'Adicione o primeiro cliente usando o botão acima.',
              style: AppTypography.bodySmall
                  .copyWith(color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

class _ClientesListaSkeleton extends StatelessWidget {
  const _ClientesListaSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.x6),
      child: SkeletonList(itemCount: 6, itemHeight: 56),
    );
  }
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

class _ClientesListaError extends StatelessWidget {
  const _ClientesListaError({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(
            PhosphorIcons.warningCircle(PhosphorIconsStyle.regular),
            size: 48,
            color: AppColors.danger,
          ),
          const SizedBox(height: AppSpacing.x4),
          Text(
            message,
            style: AppTypography.bodyMedium
                .copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.x4),
          OutlinedButton(
            onPressed: onRetry,
            child: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}
