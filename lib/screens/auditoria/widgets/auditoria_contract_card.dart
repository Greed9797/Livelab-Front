import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import '../../../models/contrato.dart';
import 'auditoria_sla_chip.dart';
import 'auditoria_status_badge.dart';

class AuditoriaContractCard extends StatelessWidget {
  final Contrato contrato;
  final VoidCallback onApprove;
  final VoidCallback onPendencia;
  final VoidCallback onReprovar;
  final VoidCallback onArquivar;

  const AuditoriaContractCard({
    super.key,
    required this.contrato,
    required this.onApprove,
    required this.onPendencia,
    required this.onReprovar,
    required this.onArquivar,
  });

  @override
  Widget build(BuildContext context) {
    final reason = contrato.pendenciaMotivo ?? contrato.reprovacaoMotivo;

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  contrato.clienteNome ?? 'Cliente sem nome',
                  style: AppTypography.h3.copyWith(color: context.colors.textPrimary),
                ),
              ),
              AuditoriaStatusBadge(status: contrato.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            contrato.clienteCnpj ?? 'CNPJ não informado',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: 4),
          Text(
            'Franqueado: ${contrato.franqueadoNome ?? 'Não informado'}',
            style: AppTypography.bodySmall,
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 16,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Ticket: R\$ ${contrato.valorFixo.toStringAsFixed(2)}',
                style: AppTypography.bodyLarge
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              Text(
                'Comissão: ${contrato.comissaoPct.toStringAsFixed(0)}%',
                style: AppTypography.bodySmall,
              ),
              AuditoriaSlaChip(hours: contrato.tempoEmEsperaHoras),
            ],
          ),
          if (reason != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.colors.bgMuted,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(reason, style: AppTypography.bodySmall),
            ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppPrimaryButton(
                onPressed: onApprove,
                icon: Icons.check,
                label: 'Aprovar',
              ),
              AppSecondaryButton(
                onPressed: onPendencia,
                icon: Icons.edit_note_rounded,
                label: 'Pendência',
              ),
              AppSecondaryButton(
                onPressed: onReprovar,
                icon: Icons.block_rounded,
                label: 'Reprovar',
              ),
              AppGhostButton(
                label: 'Arquivar',
                onPressed: onArquivar,
                icon: Icons.archive_outlined,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
