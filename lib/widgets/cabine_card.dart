import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../models/cabine.dart';
import '../design_system/design_system.dart';

/// Card de cabine modernizado com destaque pulsante ao vivo.
class CabineCard extends StatefulWidget {
  final Cabine cabine;
  final VoidCallback? onTap;
  final VoidCallback? onDoubleTap;
  final bool isSelected;
  final bool isSelectable;
  final VoidCallback? onEditTiktokUsername;

  const CabineCard({
    super.key,
    required this.cabine,
    this.onTap,
    this.onDoubleTap,
    this.isSelected = false,
    this.isSelectable = false,
    this.onEditTiktokUsername,
  });

  @override
  State<CabineCard> createState() => _CabineCardState();
}

class _CabineCardState extends State<CabineCard>
    with SingleTickerProviderStateMixin {
  int _tapCount = 0;
  Timer? _tapTimer;
  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _pulseAnim = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    if (widget.cabine.status == 'ao_vivo') {
      _pulseCtrl.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(CabineCard old) {
    super.didUpdateWidget(old);
    if (widget.cabine.status == 'ao_vivo' && !_pulseCtrl.isAnimating) {
      _pulseCtrl.repeat(reverse: true);
    } else if (widget.cabine.status != 'ao_vivo' && _pulseCtrl.isAnimating) {
      _pulseCtrl.stop();
      _pulseCtrl.value = 0;
    }
  }

  // Listener recebe raw pointer events ANTES da gesture arena,
  // garantindo que o double-tap funciona independente de filhos.
  void _handlePointerUp(PointerUpEvent event) {
    if (event.buttons != 0) return; // ignora se ainda há botão pressionado
    _tapCount++;
    if (_tapCount == 1) {
      _tapTimer = Timer(const Duration(milliseconds: 280), () {
        if (mounted && _tapCount == 1) widget.onTap?.call();
        _tapCount = 0;
      });
    } else if (_tapCount >= 2) {
      _tapTimer?.cancel();
      _tapCount = 0;
      widget.onDoubleTap?.call();
    }
  }

  @override
  void dispose() {
    _tapTimer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  Color _statusColor() => switch (widget.cabine.status) {
        'ao_vivo' => AppColors.success,
        'reservada' => AppColors.warning,
        'ativa' => AppColors.info,
        'manutencao' => AppColors.danger,
        _ => context.colors.textMuted,
      };

  AppBadgeType _statusType() => switch (widget.cabine.status) {
        'ao_vivo' => AppBadgeType.success,
        'reservada' => AppBadgeType.warning,
        'ativa' => AppBadgeType.neutral,
        'manutencao' => AppBadgeType.danger,
        _ => AppBadgeType.neutral,
      };

  String _statusLabel() => switch (widget.cabine.status) {
        'ao_vivo' => 'AO VIVO',
        'reservada' => 'RESERVADA',
        'ativa' => 'ATIVA',
        'manutencao' => 'MANUTENÇÃO',
        'disponivel' => 'DISPONÍVEL',
        _ => widget.cabine.status.toUpperCase(),
      };

  @override
  Widget build(BuildContext context) {
    final cabine = widget.cabine;
    final isSelected = widget.isSelected;
    final onEditTiktokUsername = widget.onEditTiktokUsername;
    final accent = _statusColor();
    final isLive = cabine.status == 'ao_vivo';
    final isOffline = cabine.status == 'disponivel' || cabine.status == 'ativa';
    final borderColor = isSelected
        ? AppColors.primary
        : isLive
            ? AppColors.success
            : context.colors.borderSubtle;
    final hasUsername = cabine.tiktokUsername != null &&
        cabine.tiktokUsername!.isNotEmpty;

    // Listener captura raw pointer-up antes da gesture arena — funciona mesmo
    // quando filhos (lápis de edição) têm HitTestBehavior.opaque.
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerUp: _handlePointerUp,
      child: AnimatedBuilder(
        animation: _pulseAnim,
        builder: (context, child) {
          return Opacity(
            opacity: isOffline ? 0.65 : 1.0,
            child: Container(
              decoration: isLive
                  ? BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.success
                              .withOpacity(0.12 + _pulseAnim.value * 0.22),
                          blurRadius: 8 + _pulseAnim.value * 12,
                          spreadRadius: _pulseAnim.value * 2,
                        ),
                      ],
                    )
                  : null,
              child: child,
            ),
          );
        },
        child: AppCard(
      padding: EdgeInsets.zero,
      borderColor: borderColor,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Accent line à esquerda
            Container(width: 4, color: accent),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Título com # em laranja
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(
                          text: '#',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                        TextSpan(
                          text:
                              'Cabine ${cabine.numero.toString().padLeft(2, '0')}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: context.colors.textPrimary,
                          ),
                        ),
                      ]),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    AppBadge(
                      label: _statusLabel(),
                      type: _statusType(),
                    ),
                    const SizedBox(height: 8),
                    // Cliente
                    Text(
                      cabine.clienteNome ?? 'Sem cliente vinculado',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: context.colors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // Contrato
                    if (cabine.contratoId != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Contrato ${cabine.contratoId!.substring(0, 8)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: context.colors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // TikTok username — sempre visível quando há contrato
                    if (cabine.contratoId != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.tiktok,
                            size: 12,
                            color: hasUsername
                                ? AppColors.primary
                                : context.colors.textMuted,
                          ),
                          const SizedBox(width: 3),
                          Expanded(
                            child: hasUsername
                                ? Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          '@${cabine.tiktokUsername}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.primary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: AppColors.success
                                              .withOpacity(0.12),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          'Monitor.',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.success,
                                          ),
                                        ),
                                      ),
                                    ],
                                  )
                                : Text(
                                    'TikTok não definido',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: context.colors.textMuted,
                                    ),
                                  ),
                          ),
                          // Lápis de edição
                          IconButton(
                            tooltip: 'Editar TikTok username',
                            onPressed: onEditTiktokUsername,
                            iconSize: 12,
                            visualDensity: VisualDensity.compact,
                            padding: const EdgeInsets.all(2),
                            constraints: const BoxConstraints(
                              minWidth: 20,
                              minHeight: 20,
                            ),
                            icon: Icon(
                              Icons.edit_outlined,
                              color: context.colors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                    // Apresentador (se ao vivo)
                    if (isLive && cabine.apresentadorNome != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        cabine.apresentadorNome!,
                        style: TextStyle(
                          fontSize: 11,
                          color: context.colors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // GMV + audiência (se ao vivo)
                    if (isLive) ...[
                      const SizedBox(height: 6),
                      Text(
                        'GMV R\$ ${cabine.gmvAtual.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        cabine.viewerCount > 0
                            ? '${cabine.viewerCount} espectadores'
                            : 'Ao vivo',
                        style: TextStyle(
                          fontSize: 10,
                          color: context.colors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      // Mini-stats de engajamento ao vivo
                      Row(
                        children: [
                          Icon(Icons.favorite, size: 10, color: AppColors.danger),
                          const SizedBox(width: 2),
                          Text(
                            '${cabine.likesCount}',
                            style: TextStyle(fontSize: 10, color: context.colors.textSecondary),
                          ),
                          const SizedBox(width: 6),
                          Icon(Icons.chat_bubble_outline, size: 10, color: AppColors.info),
                          const SizedBox(width: 2),
                          Text(
                            '${cabine.commentsCount}',
                            style: TextStyle(fontSize: 10, color: context.colors.textSecondary),
                          ),
                          const SizedBox(width: 6),
                          Icon(Icons.share, size: 10, color: AppColors.primary),
                          const SizedBox(width: 2),
                          Text(
                            '${cabine.sharesCount}',
                            style: TextStyle(fontSize: 10, color: context.colors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
        ),
      ),
    );
  }
}
