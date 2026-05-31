import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// ─── MODELS ──────────────────────────────────────────────────────────────────

class FinanceiroResumo {
  final double fatBruto;
  final double fatLiquido;
  final double totalCustos;
  final String periodo;

  const FinanceiroResumo({
    required this.fatBruto,
    required this.fatLiquido,
    required this.totalCustos,
    required this.periodo,
  });

  factory FinanceiroResumo.fromJson(Map<String, dynamic> j) => FinanceiroResumo(
        fatBruto: double.tryParse(j['fat_bruto']?.toString() ?? '') ?? 0.0,
        fatLiquido: double.tryParse(j['fat_liquido']?.toString() ?? '') ?? 0.0,
        totalCustos: double.tryParse(j['total_custos']?.toString() ?? '') ?? 0.0,
        periodo: j['periodo'] as String,
      );
}

class CustoCadastrado {
  final String id;
  final String descricao;
  final double valor;
  final String tipo;
  final String competencia;

  const CustoCadastrado({
    required this.id,
    required this.descricao,
    required this.valor,
    required this.tipo,
    required this.competencia,
  });

  factory CustoCadastrado.fromJson(Map<String, dynamic> j) => CustoCadastrado(
        id: j['id'] as String,
        descricao: j['descricao'] as String,
        valor: double.tryParse(j['valor']?.toString() ?? '') ?? 0.0,
        tipo: j['tipo'] as String,
        competencia: j['competencia'] as String,
      );
}

class FluxoCaixaItem {
  final DateTime dia;
  final double valor;
  const FluxoCaixaItem({required this.dia, required this.valor});
}

class FluxoCaixa {
  final List<FluxoCaixaItem> entradas;
  final List<FluxoCaixaItem> saidas;
  double get totalEntradas => entradas.fold(0, (s, e) => s + e.valor);
  double get totalSaidas => saidas.fold(0, (s, e) => s + e.valor);
  double get saldo => totalEntradas - totalSaidas;

  const FluxoCaixa({required this.entradas, required this.saidas});

  factory FluxoCaixa.fromJson(Map<String, dynamic> j) => FluxoCaixa(
        entradas: ((j['entradas'] as List?) ?? [])
            .map((e) => FluxoCaixaItem(
                  dia: DateTime.parse(e['dia'] as String),
                  valor: double.tryParse(e['valor']?.toString() ?? '') ?? 0.0,
                ))
            .toList(),
        saidas: ((j['saidas'] as List?) ?? [])
            .map((e) => FluxoCaixaItem(
                  dia: DateTime.parse(e['dia'] as String),
                  valor: double.tryParse(e['valor']?.toString() ?? '') ?? 0.0,
                ))
            .toList(),
      );
}

class ClienteFaturamento {
  final String nome;
  final String? nicho;
  final double total;
  const ClienteFaturamento(
      {required this.nome, this.nicho, required this.total});

  factory ClienteFaturamento.fromJson(Map<String, dynamic> j) =>
      ClienteFaturamento(
        nome: j['nome'] as String,
        nicho: j['nicho'] as String?,
        total: double.tryParse(j['total']?.toString() ?? '') ?? 0.0,
      );
}

// ─── PERIODO (compartilhado entre todos os providers financeiros) ────────────

/// Período selecionado no header do painel financeiro.
/// Valores: 'mes' | 'trimestre' | 'ano' (12 meses).
final financeiroPeriodoProvider = StateProvider<String>((ref) => 'mes');

/// Converte um período em intervalo `[inicio, fim]` no formato YYYY-MM.
/// Retorna os meses que o backend deve usar (o backend tolera listas).
({String inicio, String fim}) _periodRange(String periodo, DateTime now) {
  String fmt(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}';
  final fim = fmt(now);
  switch (periodo) {
    case 'trimestre':
      return (inicio: fmt(DateTime(now.year, now.month - 2)), fim: fim);
    case 'ano':
      return (inicio: fmt(DateTime(now.year, now.month - 11)), fim: fim);
    case 'mes':
    default:
      return (inicio: fim, fim: fim);
  }
}

// ─── RESUMO PROVIDER ─────────────────────────────────────────────────────────

class FinanceiroNotifier extends AsyncNotifier<FinanceiroResumo> {
  @override
  Future<FinanceiroResumo> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final periodo = ref.watch(financeiroPeriodoProvider);
    return _fetch(periodo: periodo);
  }

  Future<FinanceiroResumo> _fetch({int? mes, int? ano, String? periodo}) async {
    final params = <String, dynamic>{};
    if (mes != null) params['mes'] = mes;
    if (ano != null) params['ano'] = ano;
    if (periodo != null && periodo != 'mes') {
      final range = _periodRange(periodo, DateTime.now());
      params['inicio'] = range.inicio;
      params['fim'] = range.fim;
      params['periodo'] = periodo;
    }
    final resp = await ApiService.get('/financeiro/resumo',
        params: params.isEmpty ? null : params);
    return FinanceiroResumo.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> carregarPeriodo(int mes, int ano) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(mes: mes, ano: ano));
  }

  Future<void> adicionarCusto(Map<String, dynamic> data) async {
    await ApiService.post('/financeiro/custos', data: data);
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> deletarCusto(String id) async {
    await ApiService.delete('/financeiro/custos/$id');
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final financeiroProvider =
    AsyncNotifierProvider<FinanceiroNotifier, FinanceiroResumo>(
        FinanceiroNotifier.new);

// ─── CUSTOS LIST PROVIDER ─────────────────────────────────────────────────────

class CustosNotifier extends AsyncNotifier<List<CustoCadastrado>> {
  @override
  Future<List<CustoCadastrado>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final periodo = ref.watch(financeiroPeriodoProvider);
    return _fetch(periodo: periodo);
  }

  Future<List<CustoCadastrado>> _fetch({String periodo = 'mes'}) async {
    final now = DateTime.now();
    final params = <String, dynamic>{};
    if (periodo == 'mes') {
      params['mes'] =
          '${now.year}-${now.month.toString().padLeft(2, '0')}';
    } else {
      final range = _periodRange(periodo, now);
      params['inicio'] = range.inicio;
      params['fim'] = range.fim;
      params['periodo'] = periodo;
    }
    final resp = await ApiService.get('/financeiro/custos', params: params);
    return (resp.data as List)
        .map((e) => CustoCadastrado.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> adicionar(Map<String, dynamic> data) async {
    await ApiService.post('/financeiro/custos', data: data);
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/financeiro/custos/$id');
    if (state.hasValue) {
      state = AsyncData(state.value!.where((c) => c.id != id).toList());
    }
  }
}

final custosProvider =
    AsyncNotifierProvider<CustosNotifier, List<CustoCadastrado>>(
        CustosNotifier.new);

// ─── FLUXO DE CAIXA PROVIDER ──────────────────────────────────────────────────

class FluxoCaixaNotifier extends AsyncNotifier<FluxoCaixa> {
  @override
  Future<FluxoCaixa> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final periodo = ref.watch(financeiroPeriodoProvider);
    return _fetch(periodo: periodo);
  }

  Future<FluxoCaixa> _fetch({String periodo = 'mes'}) async {
    final now = DateTime.now();
    final params = <String, dynamic>{'mes': now.month, 'ano': now.year};
    if (periodo != 'mes') {
      final range = _periodRange(periodo, now);
      params['inicio'] = range.inicio;
      params['fim'] = range.fim;
      params['periodo'] = periodo;
    }
    final resp =
        await ApiService.get('/financeiro/fluxo-caixa', params: params);
    return FluxoCaixa.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final fluxoCaixaProvider =
    AsyncNotifierProvider<FluxoCaixaNotifier, FluxoCaixa>(
        FluxoCaixaNotifier.new);

// ─── FATURAMENTO POR CLIENTE PROVIDER ────────────────────────────────────────

class FaturamentoPorClienteNotifier
    extends AsyncNotifier<List<ClienteFaturamento>> {
  @override
  Future<List<ClienteFaturamento>> build() async {
    final authState = ref.watch(authProvider);
    if (!authState.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final periodo = ref.watch(financeiroPeriodoProvider);
    return _fetch(periodo: periodo);
  }

  Future<List<ClienteFaturamento>> _fetch({String periodo = 'mes'}) async {
    final now = DateTime.now();
    final mes =
        '${now.year}-${now.month.toString().padLeft(2, '0')}';
    final params = <String, dynamic>{'periodo': mes};
    if (periodo != 'mes') {
      final range = _periodRange(periodo, now);
      params['inicio'] = range.inicio;
      params['fim'] = range.fim;
      params['janela'] = periodo;
    }
    final resp =
        await ApiService.get('/financeiro/faturamento', params: params);
    final data = resp.data as Map<String, dynamic>;
    return ((data['por_cliente'] as List?) ?? [])
        .map((e) =>
            ClienteFaturamento.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }
}

final faturamentoPorClienteProvider =
    AsyncNotifierProvider<FaturamentoPorClienteNotifier,
        List<ClienteFaturamento>>(FaturamentoPorClienteNotifier.new);
