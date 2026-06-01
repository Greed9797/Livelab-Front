import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/app_colors.dart' as ds_colors;
import '../../design_system/app_components.dart';
import '../../design_system/app_tokens.dart' as ds_tokens;
import '../../livelab/theme/livelab_theme.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/app_scaffold.dart';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

class ClienteReserva {
  final String id;
  final String cabineId;
  final int cabineNumero;
  final String data;
  final String horaInicio;
  final String horaFim;
  final String status;
  final String? observacoes;

  const ClienteReserva({
    required this.id,
    required this.cabineId,
    required this.cabineNumero,
    required this.data,
    required this.horaInicio,
    required this.horaFim,
    required this.status,
    this.observacoes,
  });

  factory ClienteReserva.fromJson(Map<String, dynamic> j) => ClienteReserva(
        id: j['id'] as String,
        cabineId: j['cabine_id'] as String,
        cabineNumero: (j['cabine_numero'] as num).toInt(),
        data: j['data'] as String,
        horaInicio: j['hora_inicio'] as String,
        horaFim: j['hora_fim'] as String,
        status: j['status'] as String,
        observacoes: j['observacoes'] as String?,
      );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final clienteReservasProvider =
    AsyncNotifierProvider<_ClienteReservasNotifier, List<ClienteReserva>>(
        _ClienteReservasNotifier.new);

class _ClienteReservasNotifier
    extends AsyncNotifier<List<ClienteReserva>> {
  @override
  Future<List<ClienteReserva>> build() => _fetch();

  Future<List<ClienteReserva>> _fetch() async {
    final response = await ApiService.get('/cliente/reservas');
    final list = response.data as List<dynamic>;
    return list.map((e) => ClienteReserva.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class ClienteReservasScreen extends StatelessWidget {
  const ClienteReservasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentRoute: AppRoutes.clienteReservas,
      child: const Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(child: ClienteReservasBody()),
      ),
    );
  }
}

// Body reusável em tabs externas
class ClienteReservasBody extends ConsumerWidget {
  const ClienteReservasBody({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reservasAsync = ref.watch(clienteReservasProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Header(
          onRefresh: () => ref.read(clienteReservasProvider.notifier).refresh(),
          onSolicitar: () => Navigator.pushNamed(context, AppRoutes.clienteAgenda),
        ),
        Expanded(
          child: reservasAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    ApiService.extractErrorMessage(e),
                    style: const TextStyle(fontSize: 14, color: ds_colors.AppColors.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: ds_tokens.AppSpacing.x4),
                  AppGhostButton(
                    label: 'Tentar novamente',
                    onPressed: () => ref.read(clienteReservasProvider.notifier).refresh(),
                    icon: Icons.refresh,
                  ),
                ],
              ),
            ),
            data: (reservas) => reservas.isEmpty
                ? _EmptyState(
                    onSolicitar: () =>
                        Navigator.pushNamed(context, AppRoutes.clienteAgenda),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(ds_tokens.AppSpacing.x6),
                    itemCount: reservas.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: ds_tokens.AppSpacing.x3),
                    itemBuilder: (_, i) => _ReservaCard(reserva: reservas[i]),
                  ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

class _Header extends StatelessWidget {
  final VoidCallback onRefresh;
  final VoidCallback onSolicitar;

  const _Header({required this.onRefresh, required this.onSolicitar});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Próximas transmissões',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: t.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Lives solicitadas e confirmadas',
                  style: TextStyle(fontSize: 12, color: t.textMuted),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRefresh,
            icon: Icon(PhosphorIcons.arrowClockwise(), size: 18),
            color: t.textMuted,
          ),
          const SizedBox(width: 6),
          AppPrimaryButton(
            label: 'Solicitar live',
            onPressed: onSolicitar,
            icon: Icons.add_circle_outline,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  final VoidCallback onSolicitar;

  const _EmptyState({required this.onSolicitar});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: t.bgElev2,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: t.border),
              ),
              child: Icon(PhosphorIcons.calendarBlank(), size: 22, color: t.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              'Nenhuma live agendada',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: t.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              'Solicite uma live para começar',
              style: TextStyle(fontSize: 12, color: t.textMuted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            AppPrimaryButton(
              label: 'Solicitar live',
              onPressed: onSolicitar,
              icon: Icons.add_circle_outline,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reserva card
// ---------------------------------------------------------------------------

class _ReservaCard extends StatelessWidget {
  final ClienteReserva reserva;

  const _ReservaCard({required this.reserva});

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;
    final statusColor = _statusColor(reserva.status);
    final statusLabel = _statusLabel(reserva.status);

    DateTime? parsedDate;
    try {
      parsedDate = DateTime.parse(reserva.data);
    } catch (_) {}

    final dateLabel = parsedDate != null
        ? DateFormat("dd/MM", 'pt_BR').format(parsedDate)
        : reserva.data;
    final dowLabel = parsedDate != null
        ? DateFormat("EEE", 'pt_BR').format(parsedDate).toUpperCase()
        : '';

    return Container(
      decoration: BoxDecoration(
        color: t.bgElev1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: t.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Time block
          SizedBox(
            width: 54,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reserva.horaInicio,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: t.textPrimary,
                    letterSpacing: -0.5,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$dowLabel $dateLabel',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: t.textMuted,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
          // Vertical divider
          Container(
            width: 1,
            height: 36,
            color: t.border,
            margin: const EdgeInsets.symmetric(horizontal: 14),
          ),
          // Main info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cabine ${reserva.cabineNumero.toString().padLeft(2, '0')}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: t.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${reserva.horaInicio} – ${reserva.horaFim}',
                  style: TextStyle(
                    fontSize: 11,
                    color: t.textMuted,
                  ),
                ),
                if (reserva.observacoes != null &&
                    reserva.observacoes!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    reserva.observacoes!,
                    style: TextStyle(fontSize: 11, color: t.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Status badge
          _StatusPill(label: statusLabel, color: statusColor),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    return switch (status) {
      'confirmada' => ds_colors.AppColors.success,
      'pendente' => ds_colors.AppColors.warning,
      'em_andamento' => ds_colors.AppColors.primary,
      _ => ds_colors.AppColors.textMuted,
    };
  }

  String _statusLabel(String status) {
    return switch (status) {
      'confirmada' => 'Confirmada',
      'pendente' => 'Pendente',
      'em_andamento' => 'Em andamento',
      'encerrada' => 'Encerrada',
      _ => status,
    };
  }
}

class _StatusPill extends StatelessWidget {
  final String label;
  final Color color;

  const _StatusPill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
