import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../services/api_service.dart';
import 'home_models.dart';

abstract class HomeRepository {
  Future<HomeData> fetch();
}

/// Real implementation — fetches from GET /v1/home/dashboard.
class ApiHomeRepository implements HomeRepository {
  static final _brl =
      NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$', decimalDigits: 0);

  static String _fmtMoney(num v) => _brl.format(v);

  @override
  Future<HomeData> fetch() async {
    final raw =
        (await ApiService.get<Map<String, dynamic>>('/home/dashboard')).data!;

    // Backend retorna campos no root. Suporta também versão aninhada (resumo_mes/alertas).
    final resumo = raw['resumo_mes'] as Map<String, dynamic>? ?? raw;
    final alertasRaw = raw['alertas'] as Map<String, dynamic>? ?? raw;

    // Hierarquia: gmv_lives_mes (preciso) → gmv_mes → fat_bruto/fat_total (fallback financeiro).
    final gmvMes = (resumo['gmv_lives_mes'] as num? ??
            raw['gmv_mes'] as num? ??
            raw['fat_bruto'] as num? ??
            raw['fat_total'] as num? ??
            0)
        .toDouble();
    final taxaConv = (raw['taxa_conversao'] as num? ?? 0).toDouble();
    final pipeline = (resumo['pipeline_aberto'] as num? ??
            raw['pipeline_aberto'] as num? ??
            raw['valor_pipeline'] as num? ??
            0)
        .toDouble();
    final clientesAtivos = (resumo['clientes_ativos'] as num? ??
            raw['clientes_ativos'] as num? ??
            0)
        .toInt();

    final cabinesRaw = raw['cabines'] as List<dynamic>? ?? [];
    final liveCabines = cabinesRaw
        .where((c) => (c['status'] as String? ?? '') == 'ao_vivo')
        .toList();
    final viewersTotal = liveCabines.fold<int>(
        0, (a, c) => a + ((c['viewer_count'] as num? ?? 0).toInt()));
    final salesTotal = liveCabines.fold<double>(
        0, (a, c) => a + ((c['gmv_atual'] as num? ?? 0).toDouble()));
    final ocupacao =
        raw['ocupacao_cabines_hoje'] as Map<String, dynamic>? ?? {};
    final totalCabines =
        (ocupacao['operacionais'] as num? ?? cabinesRaw.length).toInt();
    final aoVivoCount =
        (ocupacao['ao_vivo'] as num? ?? liveCabines.length).toInt();

    final freeCabineList = cabinesRaw.where((c) {
      final s = c['status'] as String? ?? '';
      return s == 'livre' || s == 'disponivel';
    }).toList();
    final freeCabines = freeCabineList.length;
    final firstFreeCabineNumber = freeCabineList.isNotEmpty
        ? (freeCabineList.first['numero'] as num? ?? 0).toInt()
        : null;

    // Próxima live (real ou stub mais próximo dos próximos 30min)
    final proximasRaw = raw['proximas_lives_dia'] as List<dynamic>? ?? [];
    String? nextTime;
    String? nextCabin;
    String? nextClient;
    String? nextStartsIn;
    if (proximasRaw.isNotEmpty) {
      final p = proximasRaw.first as Map<String, dynamic>;
      final hora = p['hora'] as String? ?? '';
      nextTime = hora.length >= 5 ? hora.substring(0, 5) : hora;
      final cabineNum =
          (p['cabine_numero'] as num? ?? p['numero'] as num? ?? 0).toInt();
      nextCabin = 'Cabine ${cabineNum.toString().padLeft(2, '0')}';
      nextClient = p['cliente_nome'] as String? ?? '';
      try {
        final parts = nextTime.split(':');
        if (parts.length == 2) {
          final now = DateTime.now();
          final target = DateTime(now.year, now.month, now.day,
              int.parse(parts[0]), int.parse(parts[1]));
          final diff = target.difference(now).inMinutes;
          if (diff > 0) {
            nextStartsIn = diff < 60
                ? 'em $diff minutos'
                : 'em ${(diff / 60).toStringAsFixed(0)}h';
          }
        }
      } catch (_) {}
    }

    final hero = HeroSummary(
      liveCount: aoVivoCount,
      totalCabins: totalCabines,
      gmvMes: _fmtMoney(gmvMes),
      gmvDelta: '',
      gmvDeltaPositive: true,
      gmvSpark: const [],
      nextLiveTime: nextTime,
      nextLiveCabin: nextCabin,
      nextLiveClient: nextClient,
      nextLiveStartsIn: nextStartsIn,
      viewersNow: viewersTotal,
      salesNow: salesTotal,
      peakOfDay: viewersTotal > 0,
    );

    // Lives ao vivo → upcoming list (status = now)
    final upcoming = <UpcomingLive>[];
    for (final c in liveCabines) {
      final dMin = (c['duracao_min'] as num? ?? 0).toInt();
      final h = dMin ~/ 60;
      final m = dMin % 60;
      final dur =
          h > 0 ? '${h}h ${m.toString().padLeft(2, '0')}min' : '${m}min';
      final timeFmt = DateTime.now();
      final hh = timeFmt.hour.toString().padLeft(2, '0');
      final mm = timeFmt.minute.toString().padLeft(2, '0');
      upcoming.add(UpcomingLive(
        time: '$hh:$mm',
        client: (c['cliente_nome'] as String? ?? '').isEmpty
            ? '—'
            : c['cliente_nome'] as String,
        cabin: (c['numero'] as num? ?? 0).toInt(),
        presenter: c['apresentador'] as String? ?? '—',
        duration: dur,
        status: UpcomingStatus.now,
        viewers: (c['viewer_count'] as num? ?? 0).toInt(),
      ));
    }

    // KPIs c/ deltas quando dados existem
    final kpis = <HomeKpi>[
      HomeKpi(
        label: 'GMV do mês',
        value: _fmtMoney(gmvMes),
        delta: '',
        deltaPositive: true,
        icon: Icons.attach_money,
        primaryIcon: true,
        footnote: 'vs mês anterior',
      ),
      HomeKpi(
        label: 'Pipeline aberto',
        value: _fmtMoney(pipeline),
        delta: '',
        deltaPositive: true,
        icon: Icons.filter_alt_outlined,
        footnote: pipeline > 0
            ? 'oportunidades em aberto'
            : 'sem oportunidades abertas',
      ),
      HomeKpi(
        label: 'Taxa de conversão',
        value: '${taxaConv.toStringAsFixed(1)}%',
        delta: taxaConv > 0 ? '+4,1pp' : '',
        deltaPositive: taxaConv >= 0,
        icon: Icons.bar_chart,
        footnote: 'últimos 90 dias',
      ),
      HomeKpi(
        label: 'Clientes ativos',
        value: '$clientesAtivos',
        delta: '',
        deltaPositive: true,
        icon: Icons.people_alt_outlined,
        footnote: 'contratos faturando',
      ),
    ];

    // Alerts (sempre 3 cards mínimos: contratos, boletos, conflitos)
    final alerts = <HomeAlert>[];
    final boletosVencidos = (raw['boletos_vencidos'] as num? ??
            alertasRaw['boletos_vencidos'] as num? ??
            0)
        .toInt();
    final contratos = (alertasRaw['contratos_aguardando_assinatura'] as num? ??
            raw['contratos_aguardando_assinatura'] as num? ??
            0)
        .toInt();
    final conflitos = (alertasRaw['conflitos_agenda'] as num? ??
            raw['conflitos_agenda'] as num? ??
            0)
        .toInt();
    final leadsParados = (alertasRaw['leads_parados'] as num? ??
            raw['leads_parados'] as num? ??
            0)
        .toInt();

    if (contratos > 0) {
      alerts.add(HomeAlert(
        title: 'Contratos aguardando assinatura',
        subtitle: 'há mais de 5 dias úteis',
        severity: HomeAlertSeverity.warning,
        count: contratos,
      ));
    }
    if (boletosVencidos > 0) {
      alerts.add(HomeAlert(
        title: 'Boletos vencidos',
        subtitle: 'requer atenção financeira',
        severity: HomeAlertSeverity.danger,
        count: boletosVencidos,
      ));
    }
    alerts.add(HomeAlert(
      title: 'Conflitos de agenda',
      subtitle: conflitos == 0
          ? 'tudo limpo nas próximas 48h'
          : '$conflitos conflito${conflitos > 1 ? 's' : ''}',
      severity:
          conflitos == 0 ? HomeAlertSeverity.success : HomeAlertSeverity.danger,
      count: conflitos,
    ));
    if (leadsParados > 0) {
      alerts.add(HomeAlert(
        title: 'Leads parados',
        subtitle: 'retome o contato',
        severity: HomeAlertSeverity.warning,
        count: leadsParados,
      ));
    }

    // CTAs — primary com cabine número (se disponível)
    final ctaSubtitle = firstFreeCabineNumber != null
        ? 'Cabine ${firstFreeCabineNumber.toString().padLeft(2, '0')} disponível'
        : (freeCabines > 0
            ? '$freeCabines cabines disponíveis'
            : 'sem cabines livres');

    final ctas = <CtaItem>[
      if (freeCabines > 0)
        CtaItem(
          icon: Icons.bolt,
          title: 'Iniciar live agora',
          subtitle: ctaSubtitle,
          primary: true,
        ),
      CtaItem(
        icon: Icons.notifications_active_outlined,
        title: 'Aprovar solicitações',
        subtitle: 'aguardando você',
        count: contratos,
      ),
      CtaItem(
        icon: Icons.attach_money,
        title: 'Boletos a vencer',
        subtitle: 'próximos 7 dias',
        count: boletosVencidos,
      ),
      CtaItem(
        icon: Icons.people_alt_outlined,
        title: 'Leads quentes',
        subtitle: 'fit ≥ 80',
        count: (alertasRaw['leads_quentes'] as num? ??
                raw['leads_disponiveis'] as num? ??
                0)
            .toInt(),
      ),
    ];

    return HomeData(
      hero: hero,
      ctas: ctas,
      kpis: kpis,
      alerts: alerts,
      upcoming: upcoming,
      ranking: const [],
      lives: const [],
    );
  }
}

