# lib/providers/solicitacoes_provider.dart

- SolicitacaoFranqueador · class · L9-L58 — class SolicitacaoFranqueador
- SolicitacoesNotifier · class · L64-L109 — class SolicitacoesNotifier extends AsyncNotifier<List<SolicitacaoFranqueador>>
- build · method · L66-L72 — Future<List<SolicitacaoFranqueador>> build() async
- _fetch · method · L74-L80 — Future<List<SolicitacaoFranqueador>> _fetch() async
- refresh · method · L82-L85 — Future<void> refresh() async
- aprovar · method · L89-L93 — Future<void> aprovar(String id) async
- recusar · method · L96-L101 — Future<void> recusar(String id, String motivo) async
- criarAgendamento · method · L104-L108 — Future<void> criarAgendamento(Map<String, dynamic> data) async
- solicitacoesProvider · constant · L111-L114 — final solicitacoesProvider =
