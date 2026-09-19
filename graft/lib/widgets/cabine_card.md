# lib/widgets/cabine_card.dart

- CabineCard · class · L10-L30 — class CabineCard extends StatefulWidget
- createState · method · L29-L29 — State<CabineCard> createState() => _CabineCardState();
- _CabineCardState · class · L32-L378 — class _CabineCardState extends State<CabineCard>
- initState · method · L40-L52 — void initState()
- didUpdateWidget · method · L55-L63 — void didUpdateWidget(CabineCard old)
- _handlePointerUp · method · L67-L80 — void _handlePointerUp(PointerUpEvent event)
- dispose · method · L83-L87 — void dispose()
- _statusColor · method · L89-L95 — Color _statusColor() => switch (widget.cabine.status)
- _statusType · method · L97-L103 — AppBadgeType _statusType() => switch (widget.cabine.status)
- _statusLabel · method · L105-L112 — String _statusLabel() => switch (widget.cabine.status)
- build · method · L115-L377 — Widget build(BuildContext context)
