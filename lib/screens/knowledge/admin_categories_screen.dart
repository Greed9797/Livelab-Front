import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_category.dart';
import '../../providers/knowledge_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/skeleton_list.dart';

class AdminKnowledgeCategoriesScreen extends ConsumerWidget {
  const AdminKnowledgeCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncValue = ref.watch(knowledgeCategoriesProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.knowledgeBase,
      eyebrow: 'CONHECIMENTO',
      title: 'Categorias',
      subtitle: 'Organize os artigos por área. Arraste pelo punho para reordenar.',
      actions: [
        AppGhostButton(
          label: 'Voltar',
          icon: PhosphorIcons.arrowLeft(),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        const SizedBox(width: AppSpacing.x2),
        AppPrimaryButton(
          label: 'Nova categoria',
          icon: PhosphorIcons.plus(),
          onPressed: () => _openEditor(context, ref, null),
        ),
      ],
      child: asyncValue.when(
        loading: () => const SkeletonList(itemCount: 5, itemHeight: 80),
        error: (e, _) => EmptyStateWidget(
          icon: PhosphorIcons.warningCircle(),
          title: 'Erro ao carregar categorias',
          message: e.toString(),
          actionLabel: 'Tentar novamente',
          onAction: () =>
              ref.read(knowledgeCategoriesProvider.notifier).refresh(),
        ),
        data: (cats) {
          if (cats.isEmpty) {
            return EmptyStateWidget(
              icon: PhosphorIcons.folderOpen(),
              title: 'Nenhuma categoria',
              message: 'Crie a primeira pra começar a organizar artigos.',
              actionLabel: 'Nova categoria',
              onAction: () => _openEditor(context, ref, null),
            );
          }
          return ReorderableListView.builder(
            padding: const EdgeInsets.all(AppSpacing.x4),
            itemCount: cats.length,
            buildDefaultDragHandles: false,
            proxyDecorator: (child, index, animation) => Material(
              color: Colors.transparent,
              elevation: 8,
              shadowColor: Colors.black.withValues(alpha: 0.2),
              borderRadius: AppRadius.lgR,
              child: child,
            ),
            onReorder: (oldIndex, newIndex) async {
              if (newIndex > oldIndex) newIndex -= 1;
              if (oldIndex == newIndex) return;
              final next = [...cats];
              final moved = next.removeAt(oldIndex);
              next.insert(newIndex, moved);
              try {
                await ref
                    .read(knowledgeCategoriesProvider.notifier)
                    .reordenar(next.map((c) => c.id).toList());
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(ApiService.extractErrorMessage(e))),
                  );
                }
              }
            },
            itemBuilder: (_, i) => Padding(
              key: ValueKey('kb-cat-${cats[i].id}'),
              padding: EdgeInsets.only(
                bottom: i == cats.length - 1 ? 0 : AppSpacing.x3,
              ),
              child: _CategoryRow(
                index: i,
                category: cats[i],
                onEdit: () => _openEditor(context, ref, cats[i]),
                onDelete: () => _confirmDelete(context, ref, cats[i]),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _openEditor(
    BuildContext context,
    WidgetRef ref,
    KnowledgeCategory? cat,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (_) => _CategoryEditorDialog(category: cat),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    KnowledgeCategory cat,
  ) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Arquivar categoria'),
        content: Text(
          'Categoria "${cat.name}" será desativada (soft delete). '
          'Artigos dela continuam acessíveis via link direto. '
          'Pode reativar editando depois.',
        ),
        actions: [
          AppSecondaryButton(
            label: 'Cancelar',
            onPressed: () => Navigator.pop(ctx, false),
          ),
          AppDangerButton(
            label: 'Arquivar',
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(knowledgeCategoriesProvider.notifier).deletar(cat.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Categoria "${cat.name}" arquivada')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.extractErrorMessage(e))),
        );
      }
    }
  }
}

class _CategoryRow extends StatelessWidget {
  final int index;
  final KnowledgeCategory category;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _CategoryRow({
    required this.index,
    required this.category,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x4),
      child: Row(
        children: [
          ReorderableDragStartListener(
            index: index,
            child: MouseRegion(
              cursor: SystemMouseCursors.grab,
              child: Padding(
                padding: const EdgeInsets.only(right: AppSpacing.x3),
                child: Icon(
                  PhosphorIcons.dotsSixVertical(),
                  color: AppColors.textMuted,
                  size: 20,
                ),
              ),
            ),
          ),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.bgMuted,
              borderRadius: AppRadius.lgR,
            ),
            child: Icon(PhosphorIcons.folder(), color: AppColors.primary),
          ),
          const SizedBox(width: AppSpacing.x4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(category.name,
                        style: AppTypography.bodyLarge
                            .copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(width: AppSpacing.x2),
                    if (!category.isActive)
                      const AppBadge(
                          label: 'INATIVA',
                          type: AppBadgeType.neutral,
                          showDot: false),
                  ],
                ),
                const SizedBox(height: 2),
                Text('/${category.slug}',
                    style: AppTypography.caption
                        .copyWith(color: AppColors.textMuted)),
                if (category.description != null &&
                    category.description!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(category.description!,
                      style: AppTypography.bodySmall
                          .copyWith(color: AppColors.textSecondary)),
                ],
              ],
            ),
          ),
          IconButton(
            icon: Icon(PhosphorIcons.pencilSimple(), size: 18),
            onPressed: onEdit,
            tooltip: 'Editar',
          ),
          IconButton(
            icon: Icon(PhosphorIcons.archive(),
                size: 18, color: AppColors.danger),
            onPressed: onDelete,
            tooltip: 'Arquivar',
          ),
        ],
      ),
    );
  }
}

class _CategoryEditorDialog extends ConsumerStatefulWidget {
  final KnowledgeCategory? category;
  const _CategoryEditorDialog({this.category});

  @override
  ConsumerState<_CategoryEditorDialog> createState() =>
      _CategoryEditorDialogState();
}

class _CategoryEditorDialogState
    extends ConsumerState<_CategoryEditorDialog> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _iconCtrl;
  late final TextEditingController _orderCtrl;
  bool _isActive = true;
  bool _saving = false;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final c = widget.category;
    _nameCtrl = TextEditingController(text: c?.name ?? '');
    _descCtrl = TextEditingController(text: c?.description ?? '');
    _iconCtrl = TextEditingController(text: c?.icon ?? '');
    _orderCtrl = TextEditingController(text: (c?.sortOrder ?? 0).toString());
    _isActive = c?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _iconCtrl.dispose();
    _orderCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.category != null;
    return AlertDialog(
      title: Text(isEdit ? 'Editar categoria' : 'Nova categoria'),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nome *',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().length < 2) ? 'Mínimo 2 chars' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 2,
                  maxLength: 500,
                  decoration: const InputDecoration(
                    labelText: 'Descrição',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 4),
                TextFormField(
                  controller: _iconCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Ícone (nome Phosphor, opcional)',
                    hintText: 'book, gear, users, ...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _orderCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Ordem (sort)',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return null;
                    return int.tryParse(v.trim()) == null
                        ? 'Número inteiro'
                        : null;
                  },
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Ativa'),
                  subtitle: const Text(
                      'Inativa fica oculta da listagem pra usuários finais.'),
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        AppSecondaryButton(
          label: 'Cancelar',
          onPressed: _saving ? null : () => Navigator.pop(context),
        ),
        AppPrimaryButton(
          label: isEdit ? 'Salvar' : 'Criar',
          isLoading: _saving,
          onPressed: _saving ? null : _save,
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);

    final payload = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      if (_descCtrl.text.trim().isNotEmpty)
        'description': _descCtrl.text.trim(),
      if (_iconCtrl.text.trim().isNotEmpty) 'icon': _iconCtrl.text.trim(),
      'sort_order': int.tryParse(_orderCtrl.text.trim()) ?? 0,
      'is_active': _isActive,
    };

    try {
      final notifier = ref.read(knowledgeCategoriesProvider.notifier);
      if (widget.category == null) {
        await notifier.criar(payload);
      } else {
        await notifier.editar(widget.category!.id, payload);
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.category == null
                ? 'Categoria criada'
                : 'Categoria atualizada'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiService.extractErrorMessage(e))),
        );
      }
    }
  }
}
