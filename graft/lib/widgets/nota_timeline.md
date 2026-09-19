# lib/widgets/nota_timeline.dart

- NotaTimeline · class · L15-L122 — class NotaTimeline extends ConsumerWidget
- build · method · L20-L85 — Widget build(BuildContext context, WidgetRef ref)
- _openEditor · method · L87-L92 — Future<void> _openEditor(BuildContext context, WidgetRef ref, ClienteNota? nota) async
- _confirmDelete · method · L94-L121 — Future<void> _confirmDelete(BuildContext context, WidgetRef ref, ClienteNota nota) async
- _NotaItem · class · L124-L268 — class _NotaItem extends StatelessWidget
- _tipoMeta · constant · L139-L139 — static const _tipoMeta = <NotaTipo, ({IconData icon, Color color, String label})>{};
- _meta · method · L141-L154 — ({IconData icon, Color color, String label}) _meta()
- build · method · L157-L247 — Widget build(BuildContext context)
- _badgeType · method · L249-L257 — AppBadgeType _badgeType(NotaTipo t)
- _relTime · method · L259-L267 — String _relTime(DateTime d)
- _NotaEditorDialog · class · L270-L277 — class _NotaEditorDialog extends ConsumerStatefulWidget
- createState · method · L276-L276 — ConsumerState<_NotaEditorDialog> createState() => _NotaEditorDialogState();
- _NotaEditorDialogState · class · L279-L381 — class _NotaEditorDialogState extends ConsumerState<_NotaEditorDialog>
- initState · method · L285-L289 — void initState()
- dispose · method · L292-L295 — void dispose()
- build · method · L298-L348 — Widget build(BuildContext context)
- _save · method · L350-L380 — Future<void> _save() async
