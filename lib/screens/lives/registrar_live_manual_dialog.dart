import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/apresentadora.dart';
import '../../models/cabine.dart';
import '../../models/cliente.dart';
import '../../models/usuario.dart';
import '../../providers/apresentadoras_provider.dart';
import '../../providers/cabines_provider.dart';
import '../../providers/clientes_provider.dart';
import '../../providers/usuarios_provider.dart';
import '../../services/api_service.dart';

class RegistrarLiveManualDialog extends ConsumerStatefulWidget {
  final String? preselectedCabineId;
  final Map<String, dynamic>? liveParaEditar;

  const RegistrarLiveManualDialog({
    super.key,
    this.preselectedCabineId,
    this.liveParaEditar,
  });

  @override
  ConsumerState<RegistrarLiveManualDialog> createState() =>
      _RegistrarLiveManualDialogState();
}

class _RegistrarLiveManualDialogState
    extends ConsumerState<RegistrarLiveManualDialog> {
  final _formKey = GlobalKey<FormState>();

  DateTime? _data;
  TimeOfDay? _horaInicio;
  TimeOfDay? _horaFim;

  String? _cabineId;
  String? _clienteId;
  String? _apresentadoraId;
  String? _apresentadora2Id;
  String? _gestorId;

  final _fatController = TextEditingController();
  final _pedidosController = TextEditingController();
  final _resumoController = TextEditingController();

  bool _saving = false;
  bool get _isEdit => widget.liveParaEditar != null;

  @override
  void initState() {
    super.initState();
    final live = widget.liveParaEditar;
    if (live != null) {
      _cabineId = live['cabine_id'] as String?;
      _clienteId = live['cliente_id'] as String?;
      _apresentadoraId = live['apresentador_id'] as String?;
      _gestorId = live['gestor_id'] as String?;
      _fatController.text = (live['fat_gerado'] ?? '').toString();
      _pedidosController.text = (live['final_orders_count'] ?? '').toString();
      _resumoController.text = (live['resumo'] ?? '') as String;
      if (live['iniciado_em'] != null) {
        final dt = DateTime.tryParse(live['iniciado_em'] as String);
        if (dt != null) {
          _data = dt;
          _horaInicio = TimeOfDay(hour: dt.hour, minute: dt.minute);
        }
      }
      if (live['encerrado_em'] != null) {
        final dt = DateTime.tryParse(live['encerrado_em'] as String);
        if (dt != null) _horaFim = TimeOfDay(hour: dt.hour, minute: dt.minute);
      }
    } else {
      _cabineId = widget.preselectedCabineId;
    }
  }

  @override
  void dispose() {
    _fatController.dispose();
    _pedidosController.dispose();
    _resumoController.dispose();
    super.dispose();
  }

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _data ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _data = picked);
  }

  Future<void> _pickHora(bool isInicio) async {
    final initial = isInicio
        ? (_horaInicio ?? const TimeOfDay(hour: 18, minute: 0))
        : (_horaFim ?? const TimeOfDay(hour: 20, minute: 0));
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked != null) {
      setState(() {
        if (isInicio) {
          _horaInicio = picked;
        } else {
          _horaFim = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_data == null) {
      _showError('Selecione a data da live.');
      return;
    }
    if (_horaInicio == null || _horaFim == null) {
      _showError('Selecione hora início e hora fim.');
      return;
    }
    final hiMin = _horaInicio!.hour * 60 + _horaInicio!.minute;
    final hfMin = _horaFim!.hour * 60 + _horaFim!.minute;
    if (hfMin <= hiMin) {
      _showError('Hora fim deve ser após hora início.');
      return;
    }
    if (_apresentadora2Id != null && _apresentadora2Id == _apresentadoraId) {
      _showError('Apresentadora 2 deve ser diferente da Apresentadora 1.');
      return;
    }

    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'cabine_id': _cabineId,
        'cliente_id': _clienteId,
        'apresentador_id': _apresentadoraId,
        if (_apresentadora2Id != null) 'apresentador2_id': _apresentadora2Id,
        'gestor_id': _gestorId,
        'data': _fmtDate(_data!),
        'hora_inicio': _fmt(_horaInicio!),
        'hora_fim': _fmt(_horaFim!),
        'fat_gerado':
            double.parse(_fatController.text.replaceAll(',', '.')),
        'qtd_pedidos': int.parse(_pedidosController.text),
        if (_resumoController.text.isNotEmpty) 'resumo': _resumoController.text,
      };

      if (_isEdit) {
        await ref
            .read(cabinesProvider.notifier)
            .editarLive(widget.liveParaEditar!['id'] as String, payload);
      } else {
        await ref.read(cabinesProvider.notifier).registrarLiveManual(payload);
      }

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isEdit
                ? 'Live atualizada com sucesso.'
                : 'Live registrada com sucesso.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) _showError(ApiService.extractErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.danger));
  }

  @override
  Widget build(BuildContext context) {
    final cabinesAsync = ref.watch(cabinesProvider);
    final clientesAsync = ref.watch(clientesProvider);
    final apresentadorasAsync = ref.watch(apresentadorasProvider);
    final usuariosAsync = ref.watch(usuariosProvider);

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Header(isEdit: _isEdit),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.x4),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _SectionLabel('Quando'),
                      Row(
                        children: [
                          Expanded(
                            child: _PickerField(
                              label: 'Data',
                              value: _data != null
                                  ? '${_data!.day.toString().padLeft(2,'0')}/${_data!.month.toString().padLeft(2,'0')}/${_data!.year}'
                                  : null,
                              icon: PhosphorIcons.calendar(),
                              onTap: _pickDate,
                              required: true,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.x2),
                          Expanded(
                            child: _PickerField(
                              label: 'Hora início',
                              value: _horaInicio != null ? _fmt(_horaInicio!) : null,
                              icon: PhosphorIcons.clock(),
                              onTap: () => _pickHora(true),
                              required: true,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.x2),
                          Expanded(
                            child: _PickerField(
                              label: 'Hora fim',
                              value: _horaFim != null ? _fmt(_horaFim!) : null,
                              icon: PhosphorIcons.clockCountdown(),
                              onTap: () => _pickHora(false),
                              required: true,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      _SectionLabel('Onde'),
                      cabinesAsync.when(
                        loading: () => const _DropdownShimmer(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (cabines) => _DropdownField<Cabine>(
                          label: 'Cabine',
                          items: cabines,
                          value: cabines.where((c) => c.id == _cabineId).firstOrNull,
                          displayText: (c) => c.nome ?? 'Cabine ${c.numero}',
                          onChanged: (c) => setState(() => _cabineId = c?.id),
                          required: true,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      _SectionLabel('Cliente'),
                      clientesAsync.when(
                        loading: () => const _DropdownShimmer(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (clientes) => _DropdownField<Cliente>(
                          label: 'Cliente',
                          items: clientes,
                          value: clientes.where((c) => c.id == _clienteId).firstOrNull,
                          displayText: (c) => c.nome,
                          onChanged: (c) => setState(() => _clienteId = c?.id),
                          required: true,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      _SectionLabel('Equipe'),
                      apresentadorasAsync.when(
                        loading: () => const _DropdownShimmer(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (aps) => Column(
                          children: [
                            _DropdownField<Apresentadora>(
                              label: 'Apresentadora 1',
                              items: aps,
                              value: aps.where((a) => a.id == _apresentadoraId).firstOrNull,
                              displayText: (a) => a.nome,
                              onChanged: (a) => setState(() => _apresentadoraId = a?.id),
                              required: true,
                            ),
                            const SizedBox(height: AppSpacing.x2),
                            _DropdownField<Apresentadora>(
                              label: 'Apresentadora 2 (opcional)',
                              items: aps.where((a) => a.id != _apresentadoraId).toList(),
                              value: aps.where((a) => a.id == _apresentadora2Id).firstOrNull,
                              displayText: (a) => a.nome,
                              onChanged: (a) => setState(() => _apresentadora2Id = a?.id),
                              required: false,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      usuariosAsync.when(
                        loading: () => const _DropdownShimmer(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (usuarios) {
                          final gestores = usuarios
                              .where((u) => u.ativo && const {
                                    'franqueado',
                                    'gerente',
                                    'gerente_comercial',
                                    'franqueador_master',
                                  }.contains(u.papel))
                              .toList();
                          return _DropdownField<Usuario>(
                            label: 'Gestor responsável',
                            items: gestores,
                            value: gestores.where((u) => u.id == _gestorId).firstOrNull,
                            displayText: (u) => u.nome,
                            onChanged: (u) => setState(() => _gestorId = u?.id),
                            required: true,
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      _SectionLabel('Resultado'),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _fatController,
                              decoration: const InputDecoration(
                                labelText: 'GMV total (R\$)',
                                prefixText: 'R\$ ',
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(RegExp(r'[\d,.]')),
                              ],
                              validator: (v) {
                                if (v == null || v.isEmpty) return 'Obrigatório';
                                final d = double.tryParse(v.replaceAll(',', '.'));
                                if (d == null || d < 0) return 'Valor inválido';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: AppSpacing.x2),
                          Expanded(
                            child: TextFormField(
                              controller: _pedidosController,
                              decoration: const InputDecoration(
                                labelText: 'Qtd pedidos',
                              ),
                              keyboardType: TextInputType.number,
                              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                              validator: (v) {
                                if (v == null || v.isEmpty) return 'Obrigatório';
                                if (int.tryParse(v) == null) return 'Valor inválido';
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      _SectionLabel('Resumo'),
                      TextFormField(
                        controller: _resumoController,
                        decoration: const InputDecoration(
                          labelText: 'Resumo da live (opcional)',
                          alignLabelWithHint: true,
                        ),
                        maxLines: 4,
                        maxLength: 2000,
                      ),
                      const SizedBox(height: AppSpacing.x4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: _saving ? null : () => Navigator.of(context).pop(),
                            child: const Text('Cancelar'),
                          ),
                          const SizedBox(width: AppSpacing.x2),
                          FilledButton(
                            onPressed: _saving ? null : _submit,
                            child: _saving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Text(_isEdit ? 'Salvar alterações' : 'Registrar Live'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final bool isEdit;
  const _Header({required this.isEdit});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4, vertical: AppSpacing.x3),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.bgMuted),
        ),
      ),
      child: Row(
        children: [
          Icon(PhosphorIcons.videoCamera(), color: AppColors.primary, size: 20),
          const SizedBox(width: AppSpacing.x2),
          Expanded(
            child: Text(
              isEdit ? 'Editar Live' : 'Registrar Live',
              style: AppTypography.h3,
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: Icon(PhosphorIcons.x()),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Text(text, style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted)),
    );
  }
}

class _PickerField extends StatelessWidget {
  final String label;
  final String? value;
  final IconData icon;
  final VoidCallback onTap;
  final bool required;

  const _PickerField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    required this.required,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: Icon(icon, size: 16),
          errorText: required && value == null ? '' : null,
        ),
        child: Text(
          value ?? '—',
          style: value == null
              ? AppTypography.bodySmall.copyWith(color: AppColors.textMuted)
              : AppTypography.bodySmall,
        ),
      ),
    );
  }
}

class _DropdownField<T> extends StatelessWidget {
  final String label;
  final List<T> items;
  final T? value;
  final String Function(T) displayText;
  final void Function(T?) onChanged;
  final bool required;

  const _DropdownField({
    required this.label,
    required this.items,
    required this.value,
    required this.displayText,
    required this.onChanged,
    required this.required,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(labelText: label),
      isExpanded: true,
      items: items
          .map((item) => DropdownMenuItem<T>(
                value: item,
                child: Text(displayText(item), overflow: TextOverflow.ellipsis),
              ))
          .toList(),
      onChanged: onChanged,
      validator: required
          ? (v) => v == null ? 'Obrigatório' : null
          : null,
    );
  }
}

class _DropdownShimmer extends StatelessWidget {
  const _DropdownShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: AppColors.bgMuted,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
    );
  }
}
