import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/app_screen_scaffold.dart';
import '../../models/regional_manager.dart';
import '../../models/tenant.dart';
import '../../providers/regional_managers_provider.dart';
import '../../providers/tenants_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../design_system/design_system.dart';

/// Tela administrativa (`franqueador_master` only) para gerenciar quais
/// unidades cada `gerente_regional` enxerga (Tier 4, multi-tenant).
class RegionalManagersScreen extends ConsumerWidget {
  const RegionalManagersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncManagers = ref.watch(regionalManagersProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.masterRegionalManagers,
      eyebrow: 'MASTER',
      title: 'Gerentes regionais',
      subtitle:
          'Configure quais unidades cada gerente regional pode enxergar no painel master.',
      titleSerif: true,
      actions: [
        IconButton(
          icon: Icon(PhosphorIcons.arrowsClockwise(), size: 20),
          tooltip: 'Atualizar',
          onPressed: () =>
              ref.read(regionalManagersProvider.notifier).refresh(),
        ),
      ],
      child: asyncManagers.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => _ErrorState(
          message: ApiService.extractErrorMessage(err),
          onRetry: () =>
              ref.read(regionalManagersProvider.notifier).refresh(),
        ),
        data: (managers) {
          if (managers.isEmpty) return const _EmptyState();
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(28, 8, 28, 32),
            itemCount: managers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _ManagerRow(manager: managers[i]),
          );
        },
      ),
    );
  }
}

class _ManagerRow extends ConsumerWidget {
  const _ManagerRow({required this.manager});
  final RegionalManager manager;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withValues(alpha: 0.12),
            child: Text(
              _initials(manager.nome),
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  manager.nome.isEmpty ? '(sem nome)' : manager.nome,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  manager.email,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _Chip(
                      label: '${manager.tenantsCount} unidade'
                          '${manager.tenantsCount == 1 ? '' : 's'}',
                      color: manager.tenantsCount > 0
                          ? AppColors.success
                          : AppColors.textMuted,
                    ),
                    if (!manager.ativo)
                      const _Chip(
                        label: 'inativo',
                        color: AppColors.danger,
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          OutlinedButton.icon(
            onPressed: () => _openEditDialog(context, ref),
            icon: Icon(PhosphorIcons.pencilSimple(), size: 16),
            label: const Text('Editar acessos'),
          ),
        ],
      ),
    );
  }

  String _initials(String nome) {
    final parts = nome.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  void _openEditDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _EditTenantsDialog(manager: manager),
    );
  }
}

class _EditTenantsDialog extends ConsumerStatefulWidget {
  const _EditTenantsDialog({required this.manager});
  final RegionalManager manager;

  @override
  ConsumerState<_EditTenantsDialog> createState() => _EditTenantsDialogState();
}

class _EditTenantsDialogState extends ConsumerState<_EditTenantsDialog> {
  late Set<String> _selected;
  String _filter = '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.manager.tenants.map((t) => t.id).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final asyncTenants = ref.watch(tenantsProvider);

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Acessos de ${widget.manager.nome}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Selecione as unidades que este gerente regional poderá visualizar no painel master.',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 14),
              TextField(
                onChanged: (v) => setState(() => _filter = v.toLowerCase()),
                decoration: InputDecoration(
                  hintText: 'Filtrar unidades…',
                  prefixIcon: Icon(PhosphorIcons.magnifyingGlass(), size: 18),
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: asyncTenants.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text(
                    ApiService.extractErrorMessage(e),
                    style: const TextStyle(color: AppColors.danger),
                  ),
                  data: (tenants) => _TenantList(
                    tenants: _filterTenants(tenants),
                    selected: _selected,
                    onToggle: (id, checked) {
                      setState(() {
                        if (checked) {
                          _selected.add(id);
                        } else {
                          _selected.remove(id);
                        }
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Text(
                    '${_selected.length} selecionada'
                    '${_selected.length == 1 ? '' : 's'}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _saving
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: const Text('Cancelar'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Salvar'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Tenant> _filterTenants(List<Tenant> all) {
    if (_filter.isEmpty) return all;
    return all
        .where((t) => t.nome.toLowerCase().contains(_filter))
        .toList();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(regionalManagersProvider.notifier)
          .setTenants(widget.manager.id, _selected.toList());
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Acessos atualizados')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.extractErrorMessage(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _TenantList extends StatelessWidget {
  const _TenantList({
    required this.tenants,
    required this.selected,
    required this.onToggle,
  });

  final List<Tenant> tenants;
  final Set<String> selected;
  final void Function(String id, bool checked) onToggle;

  @override
  Widget build(BuildContext context) {
    if (tenants.isEmpty) {
      return const Center(
        child: Text(
          'Nenhuma unidade encontrada',
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
    }
    return ListView.separated(
      itemCount: tenants.length,
      separatorBuilder: (_, __) =>
          const Divider(height: 1, color: AppColors.borderLight),
      itemBuilder: (_, i) {
        final t = tenants[i];
        final isSelected = selected.contains(t.id);
        return CheckboxListTile(
          value: isSelected,
          onChanged: (v) => onToggle(t.id, v ?? false),
          dense: true,
          title: Text(
            t.nome,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
          subtitle: t.cidade != null
              ? Text(
                  '${t.cidade}${t.uf != null ? ' / ${t.uf}' : ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                )
              : null,
          controlAffinity: ListTileControlAffinity.leading,
        );
      },
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              PhosphorIcons.usersThree(),
              size: 48,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 12),
            const Text(
              'Nenhum gerente regional cadastrado',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            const Text(
              'Convide um usuário com papel "Gerente Regional" em /usuarios para começar a configurar acessos multi-unidade.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              PhosphorIcons.warningCircle(),
              size: 48,
              color: AppColors.danger,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Tentar novamente')),
          ],
        ),
      ),
    );
  }
}
