class CabineStatus {
  final int numero;
  final String status;
  final String? liveAtualId;
  final int viewerCount;
  final double gmvAtual;
  final String? clienteNome;
  final String? apresentador;
  final int duracaoMin;

  const CabineStatus({
    required this.numero,
    required this.status,
    this.liveAtualId,
    this.viewerCount = 0,
    this.gmvAtual = 0.0,
    this.clienteNome,
    this.apresentador,
    this.duracaoMin = 0,
  });

  factory CabineStatus.fromJson(Map<String, dynamic> j) => CabineStatus(
        numero: j['numero'] as int,
        status: j['status'] as String,
        liveAtualId: j['live_atual_id'] as String?,
        viewerCount: j['viewer_count'] == null
            ? 0
            : int.tryParse(j['viewer_count'].toString()) ?? 0,
        gmvAtual: j['gmv_atual'] == null
            ? 0.0
            : double.tryParse(j['gmv_atual'].toString()) ?? 0.0,
        clienteNome: j['cliente_nome'] as String?,
        apresentador: j['apresentador'] as String?,
        duracaoMin: j['duracao_min'] == null
            ? 0
            : int.tryParse(j['duracao_min'].toString()) ?? 0,
      );
}

class RankingEntry {
  final String nome;
  final double gmv;
  final int lives;

  const RankingEntry({
    required this.nome,
    required this.gmv,
    required this.lives,
  });

  factory RankingEntry.fromJson(Map<String, dynamic> j) => RankingEntry(
        nome: j['nome'] as String,
        gmv: j['gmv'] == null
            ? 0.0
            : double.tryParse(j['gmv'].toString()) ?? 0.0,
        lives:
            j['lives'] == null ? 0 : int.tryParse(j['lives'].toString()) ?? 0,
      );
}

class OcupacaoCabinesHoje {
  final int aoVivo;
  final int operacionais;

  const OcupacaoCabinesHoje({
    required this.aoVivo,
    required this.operacionais,
  });

  factory OcupacaoCabinesHoje.fromJson(Map<String, dynamic>? j) =>
      OcupacaoCabinesHoje(
        aoVivo: int.tryParse('${j?['ao_vivo'] ?? 0}') ?? 0,
        operacionais: int.tryParse('${j?['operacionais'] ?? 0}') ?? 0,
      );

  double get percentual =>
      operacionais <= 0 ? 0 : (aoVivo / operacionais).clamp(0, 1).toDouble();
}

class ProximaLiveDia {
  final String id;
  final String data;
  final String horaInicio;
  final String horaFim;
  final int cabineNumero;
  final String clienteNome;

  const ProximaLiveDia({
    required this.id,
    required this.data,
    required this.horaInicio,
    required this.horaFim,
    required this.cabineNumero,
    required this.clienteNome,
  });

  factory ProximaLiveDia.fromJson(Map<String, dynamic> j) => ProximaLiveDia(
        id: j['id']?.toString() ?? '',
        data: j['data_solicitada']?.toString() ?? '',
        horaInicio: j['hora_inicio']?.toString() ?? '',
        horaFim: j['hora_fim']?.toString() ?? '',
        cabineNumero: int.tryParse('${j['cabine_numero'] ?? 0}') ?? 0,
        clienteNome: j['cliente_nome']?.toString() ?? 'Cliente',
      );
}

class DashboardData {
  final double gmvMes;
  final int pipelineAberto;
  final double valorPipeline;
  final double fatTotal;
  final double fatBruto;
  final double fatLiquido;

  // Array de Cabines com status real-time
  final List<CabineStatus> cabines;

  // Resumo do mês
  final int clientesAtivos;
  final int novosClientes;
  final int churnMes;
  final int livesMes;
  final double gmvLivesMes;
  final int mediaViewers;

  // Alertas
  final int contratosAnalise;
  final int boletosVencidos;
  final int leadsDisponiveis;
  final int agendamentosSemana;
  final OcupacaoCabinesHoje ocupacaoCabinesHoje;
  final List<ProximaLiveDia> proximasLivesDia;
  final int inadimplentes;
  final int contratosAguardandoAssinatura;
  final int leadsParados;
  final int conflitosAgenda;

  // Taxa de conversão (ganhos / fechados × 100)
  final double taxaConversao;

  // Ranking do Dia
  final List<RankingEntry> rankingDia;

  const DashboardData({
    required this.gmvMes,
    required this.pipelineAberto,
    required this.valorPipeline,
    required this.fatTotal,
    required this.fatBruto,
    required this.fatLiquido,
    required this.cabines,
    required this.clientesAtivos,
    required this.novosClientes,
    required this.churnMes,
    required this.livesMes,
    required this.gmvLivesMes,
    required this.mediaViewers,
    required this.contratosAnalise,
    required this.boletosVencidos,
    required this.leadsDisponiveis,
    required this.agendamentosSemana,
    required this.ocupacaoCabinesHoje,
    required this.proximasLivesDia,
    required this.inadimplentes,
    required this.contratosAguardandoAssinatura,
    required this.leadsParados,
    required this.conflitosAgenda,
    this.taxaConversao = 0,
    required this.rankingDia,
  });

  factory DashboardData.fromJson(Map<String, dynamic> j) => DashboardData(
        gmvMes: j['gmv_mes'] == null
            ? double.tryParse('${j['gmv_lives_mes'] ?? 0}') ?? 0.0
            : double.tryParse(j['gmv_mes'].toString()) ?? 0.0,
        pipelineAberto: j['pipeline_aberto'] == null
            ? int.tryParse('${j['leads_disponiveis'] ?? 0}') ?? 0
            : int.tryParse(j['pipeline_aberto'].toString()) ?? 0,
        valorPipeline: j['valor_pipeline'] == null
            ? 0.0
            : double.tryParse(j['valor_pipeline'].toString()) ?? 0.0,
        fatTotal: j['fat_total'] == null
            ? 0.0
            : double.tryParse(j['fat_total'].toString()) ?? 0.0,
        fatBruto: j['fat_bruto'] == null
            ? 0.0
            : double.tryParse(j['fat_bruto'].toString()) ?? 0.0,
        fatLiquido: j['fat_liquido'] == null
            ? 0.0
            : double.tryParse(j['fat_liquido'].toString()) ?? 0.0,
        clientesAtivos: j['clientes_ativos'] == null
            ? 0
            : int.tryParse(j['clientes_ativos'].toString()) ?? 0,
        novosClientes: j['novos_clientes'] == null
            ? 0
            : int.tryParse(j['novos_clientes'].toString()) ?? 0,
        churnMes: j['churn_mes'] == null
            ? 0
            : int.tryParse(j['churn_mes'].toString()) ?? 0,
        livesMes: j['lives_mes'] == null
            ? 0
            : int.tryParse(j['lives_mes'].toString()) ?? 0,
        gmvLivesMes: j['gmv_lives_mes'] == null
            ? 0.0
            : double.tryParse(j['gmv_lives_mes'].toString()) ?? 0.0,
        mediaViewers: j['media_viewers'] == null
            ? 0
            : int.tryParse(j['media_viewers'].toString()) ?? 0,
        contratosAnalise: j['contratos_analise'] == null
            ? 0
            : int.tryParse(j['contratos_analise'].toString()) ?? 0,
        boletosVencidos: j['boletos_vencidos'] == null
            ? 0
            : int.tryParse(j['boletos_vencidos'].toString()) ?? 0,
        leadsDisponiveis: j['leads_disponiveis'] == null
            ? 0
            : int.tryParse(j['leads_disponiveis'].toString()) ?? 0,
        agendamentosSemana: j['agendamentos_semana'] == null
            ? 0
            : int.tryParse(j['agendamentos_semana'].toString()) ?? 0,
        ocupacaoCabinesHoje: OcupacaoCabinesHoje.fromJson(
          j['ocupacao_cabines_hoje'] is Map
              ? Map<String, dynamic>.from(j['ocupacao_cabines_hoje'] as Map)
              : null,
        ),
        proximasLivesDia: (j['proximas_lives_dia'] as List?)
                ?.map((e) => ProximaLiveDia.fromJson(
                    Map<String, dynamic>.from(e as Map)))
                .toList() ??
            [],
        inadimplentes: int.tryParse('${j['inadimplentes'] ?? 0}') ?? 0,
        contratosAguardandoAssinatura:
            int.tryParse('${j['contratos_aguardando_assinatura'] ?? 0}') ?? 0,
        leadsParados: int.tryParse('${j['leads_parados'] ?? 0}') ?? 0,
        conflitosAgenda: int.tryParse('${j['conflitos_agenda'] ?? 0}') ?? 0,
        taxaConversao: j['taxa_conversao'] == null
            ? 0.0
            : double.tryParse(j['taxa_conversao'].toString()) ?? 0.0,
        cabines: (j['cabines'] as List?)
                ?.map((e) => CabineStatus.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        rankingDia: (j['ranking_dia'] as List?)
                ?.map((e) => RankingEntry.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}
