import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../design_system/design_system.dart';
import '../models/cliente_nota.dart';
import '../providers/auth_provider.dart';
import '../providers/cliente_notas_provider.dart';
import '../services/api_service.dart';
import 'empty_state_widget.dart';
import 'skeleton_list.dart';

/// Timeline de notas/histórico de contato em um cliente.
/// Suporte+marketing+admin podem escrever; outros leem (controlado backend).
class NotaTimeline extends ConsumerWidget {
  final String clienteId;
  const NotaTimeline({super.key, required this.clienteId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncValue = ref.watch(clienteNotasProvider(clienteId));
    final auth = ref.watch(authProvider);
    final canWrite = const {
      'franqueador_master', 'franqueado', 'gerente', 'gerente_comercial',
      'suporte', 'marketing',
    }.contains(auth.user?.papel);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Histórico',
                style: AppTypography.h3.copyWith(fontWeight: FontWeight.w600)),
            if (canWrite)
              AppPrimaryButton(
                label: 'Adicionar nota',
                icon: PhosphorIcons.plus(),
                onPressed: () => _openEditor(context, ref, null),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.x4),
        asyncValue.when(
          loading: () => const SkeletonList(itemCount: 3, itemHeight: 80),
          error: (e, _) => EmptyStateWidget(
            icon: PhosphorIcons.warningCircle(),
            title: 'Erro ao carregar histórico',
            message: ApiService.extractErrorMessage(e),
            actionLabel: 'Tentar novamente',
            onAction: () =>
                ref.read(clienteNotasProvider(clienteId).notifier).refresh(),
          ),
          data: (notas) {
            if (notas.isEmpty) {
              return EmptyStateWidget(
                icon: PhosphorIcons.notepad(),
                title: 'Sem notas ainda',
                message: canWrite
                    ? 'Adicione a primeira nota pra registrar contato.'
                    : 'Nenhuma interação registrada nesse cliente.',
              );
            }
            return Column(
              children: [
                for (var i = 0; i < notas.length; i++) ...[
                  _NotaItem(
                    nota: notas[i],
                    canEdit: canWrite &&
                        (notas[i].autorId == auth.user?.id ||
                            const {'franqueador_master', 'franqueado'}
                                .contains(auth.user?.papel)),
                    onEdit: () => _openEditor(context, ref, notas[i]),
                    onDelete: () => _confirmDelete(context, ref, notas[i]),
                    isLast: i == notas.length - 1,
                  ),
                ],
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _openEditor(BuildContext context, WidgetRef ref, ClienteNota? nota) async {
    await showDialog<void>(
      context: context,
      builder: (_) => _NotaEditorDialog(clienteId: clienteId, nota: nota),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, ClienteNota nota) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Deletar nota'),
        content: const Text('Esta ação não pode ser desfeita.'),
        actions: [
          AppSecondaryButton(label: 'Cancelar', onPressed: () => Navigator.pop(ctx, false)),
          AppDangerButton(label: 'Deletar', onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(clienteNotasProvider(clienteId).notifier).deletar(nota.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nota deletada')),
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

class _NotaItem extends StatelessWidget {
  final ClienteNota nota;
  final bool canEdit;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final bool isLast;

  const _NotaItem({
    required this.nota,
    required this.canEdit,
    required this.onEdit,
    required this.onDelete,
    required this.isLast,
  });

  static const _tipoMeta = <NotaTipo, ({IconData icon, Color color, String label})>{};

  ({IconData icon, Color color, String label}) _meta() {
    switch (nota.tipo) {
      case NotaTipo.nota:
        return (icon: PhosphorIcons.note(), color: AppColors.info, label: 'Nota');
      case NotaTipo.ligacao:
        return (icon: PhosphorIcons.phone(), color: AppColors.primary, label: 'Ligação');
      case NotaTipo.reuniao:
        return (icon: PhosphorIcons.users(), color: AppColors.success, label: 'Reunião');
      case NotaTipo.reclamacao:
        return (icon: PhosphorIcons.warning(), color: AppColors.danger, label: 'Reclamação');
      case NotaTipo.elogio:
        return (icon: PhosphorIcons.star(), color: AppColors.warning, label: 'Elogio');
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = _meta();
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.x3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: m.color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(m.icon, size: 16, color: m.color),
              ),
              if (!isLast)
                Container(
                  width: 2, height: 60,
                  margin: const EdgeInsets.only(top: 4),
                  color: AppColors.borderLight,
                ),
            ],
          ),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: AppCard(
              padding: const EdgeInsets.all(AppSpacing.x4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      AppBadge(label: m.label.toUpperCase(),
                          type: _badgeType(nota.tipo), showDot: false),
                      const SizedBox(width: AppSpacing.x2),
                      Expanded(
                        child: Text(nota.autorNome,
                            style: AppTypography.bodySmall.copyWith(
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary)),
                      ),
                      Text(_relTime(nota.criadoEm),
                          style: AppTypography.caption
                              .copyWith(color: AppColors.textMuted)),
                      if (canEdit) ...[
                        const SizedBox(width: 4),
                        SizedBox(
                          width: 28, height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            iconSize: 14,
                            icon: Icon(PhosphorIcons.pencilSimple(),
                                color: AppColors.textMuted),
                            onPressed: onEdit,
                            tooltip: 'Editar',
                          ),
                        ),
                        SizedBox(
                          width: 28, height: 28,
                          child: IconButton(
                            padding: EdgeInsets.zero,
                            iconSize: 14,
                            icon: Icon(PhosphorIcons.trash(), color: AppColors.danger),
                            onPressed: onDelete,
                            tooltip: 'Deletar',
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppSpacing.x2),
                  Text(nota.texto,
                      style: AppTypography.bodyMedium
                          .copyWith(color: AppColors.textPrimary, height: 1.5)),
                  if (nota.editadoEm != null) ...[
                    const SizedBox(height: 4),
                    Text('editada ${_relTime(nota.editadoEm!)}',
                        style: AppTypography.caption.copyWith(
                            color: AppColors.textMuted,
                            fontStyle: FontStyle.italic)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  AppBadgeType _badgeType(NotaTipo t) {
    switch (t) {
      case NotaTipo.nota: return AppBadgeType.info;
      case NotaTipo.ligacao: return AppBadgeType.neutral;
      case NotaTipo.reuniao: return AppBadgeType.success;
      case NotaTipo.reclamacao: return AppBadgeType.danger;
      case NotaTipo.elogio: return AppBadgeType.warning;
    }
  }

  String _relTime(DateTime d) {
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'agora';
    if (diff.inMinutes < 60) return 'há ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'há ${diff.inHours}h';
    if (diff.inDays < 7) return 'há ${diff.inDays}d';
    if (diff.inDays < 30) return 'há ${(diff.inDays / 7).floor()} sem';
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  }
}

class _NotaEditorDialog extends ConsumerStatefulWidget {
  final String clienteId;
  final ClienteNota? nota;
  const _NotaEditorDialog({required this.clienteId, this.nota});

  @override
  ConsumerState<_NotaEditorDialog> createState() => _NotaEditorDialogState();
}

class _NotaEditorDialogState extends ConsumerState<_NotaEditorDialog> {
  late final TextEditingController _textoCtrl;
  late NotaTipo _tipo;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _textoCtrl = TextEditingController(text: widget.nota?.texto ?? '');
    _tipo = widget.nota?.tipo ?? NotaTipo.nota;
  }

  @override
  void dispose() {
    _textoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.nota != null;
    return AlertDialog(
      title: Text(isEdit ? 'Editar nota' : 'Nova nota'),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tipo'),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: NotaTipo.values.map((t) {
                final selected = _tipo == t;
                return ChoiceChip(
                  label: Text(tipoLabel(t)),
                  selected: selected,
                  onSelected: (_) => setState(() => _tipo = t),
                );
              }).toList(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _textoCtrl,
              maxLines: 5,
              maxLength: 5000,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Conteúdo *',
                hintText: 'Detalhe do contato, observações, próximos passos...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        AppSecondaryButton(
          label: 'Cancelar',
          onPressed: _saving ? null : () => Navigator.pop(context),
        ),
        AppPrimaryButton(
          label: isEdit ? 'Salvar' : 'Adicionar',
          isLoading: _saving,
          onPressed: _saving ? null : _save,
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (_textoCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Texto obrigatório')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final notifier = ref.read(clienteNotasProvider(widget.clienteId).notifier);
      if (widget.nota == null) {
        await notifier.criar(texto: _textoCtrl.text.trim(), tipo: _tipo);
      } else {
        await notifier.editar(widget.nota!.id,
            texto: _textoCtrl.text.trim(), tipo: _tipo);
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.nota == null ? 'Nota criada' : 'Nota atualizada')),
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
