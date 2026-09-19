# lib/screens/boletos/boletos_screen.dart

- BoletosScreen · class · L13-L18 — class BoletosScreen extends ConsumerStatefulWidget
- createState · method · L17-L17 — ConsumerState<BoletosScreen> createState() => _BoletosScreenState();
- _BoletosScreenState · class · L20-L32 — class _BoletosScreenState extends ConsumerState<BoletosScreen>
- build · method · L22-L31 — Widget build(BuildContext context)
- BoletosTab · class · L34-L39 — class BoletosTab extends ConsumerStatefulWidget
- createState · method · L38-L38 — ConsumerState<BoletosTab> createState() => _BoletosTabState();
- _BoletosTabState · class · L41-L373 — class _BoletosTabState extends ConsumerState<BoletosTab>
- _filtrar · method · L45-L51 — List<Boleto> _filtrar(List<Boleto> boletos)
- _countVencidos · method · L53-L60 — int _countVencidos(List<Boleto> boletos)
- _countAVencer · method · L62-L71 — int _countAVencer(List<Boleto> boletos)
- _countPagoMes · method · L73-L82 — int _countPagoMes(List<Boleto> boletos)
- _mapStatus · method · L84-L90 — BoletoStatus _mapStatus(String s)
- _showAsaasPending · method · L92-L102 — void _showAsaasPending()
- _copiarBoleto · method · L104-L116 — Future<void> _copiarBoleto(Boleto b) async
- _pagarBoleto · method · L118-L120 — void _pagarBoleto(Boleto b)
- _abrirBoleto · method · L122-L163 — Future<void> _abrirBoleto(Boleto b) async
- _categoriaLabel · method · L165-L172 — String _categoriaLabel(String tipo) =>
- build · method · L175-L372 — Widget build(BuildContext context)
