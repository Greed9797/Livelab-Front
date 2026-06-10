import 'package:flutter_test/flutter_test.dart';

import 'package:liveshop_saas/providers/cliente_operacional_provider.dart';
import 'package:liveshop_saas/screens/painel_cliente/cliente_operacional_widgets.dart'
    show formatOrNaoInformado;

void main() {
  // -----------------------------------------------------------------------
  // formatOrNaoInformado helper
  // -----------------------------------------------------------------------
  group('formatOrNaoInformado', () {
    test('retorna "não informado" para null', () {
      expect(formatOrNaoInformado(null), 'não informado');
      expect(formatOrNaoInformado(null, isCurrency: true), 'não informado');
      expect(formatOrNaoInformado(null, isHours: true), 'não informado');
      expect(formatOrNaoInformado(null, isPercent: true), 'não informado');
    });

    test('formata moeda corretamente para valor não-null', () {
      final result = formatOrNaoInformado(1234.56, isCurrency: true);
      expect(result, contains('1.234,56'));
      expect(result, contains('R\$'));
    });

    test('formata horas corretamente', () {
      final result = formatOrNaoInformado(3.5, isHours: true);
      expect(result, endsWith('h'));
      expect(result, contains('3'));
    });

    test('formata percentual corretamente', () {
      final result = formatOrNaoInformado(87.3, isPercent: true);
      expect(result, endsWith('%'));
      expect(result, contains('87'));
    });

    test('formata inteiro como string', () {
      expect(formatOrNaoInformado(42), '42');
    });

    test('zero NÃO é tratado como null — retorna o valor formatado', () {
      expect(formatOrNaoInformado(0.0, isCurrency: true), isNot('não informado'));
      expect(formatOrNaoInformado(0, isHours: true), isNot('não informado'));
    });
  });

  // -----------------------------------------------------------------------
  // JSON parsing — nulls preservados nos models
  // -----------------------------------------------------------------------
  group('ClienteOperacional.fromJson', () {
    test('campo null em metricas preserva null (não converte para 0)', () {
      final json = <String, dynamic>{
        'periodo': '2026-06',
        'config': {
          'meta_gmv_hora': null,
          'margem_pct': null,
          'comissao_livelab_pct': null,
        },
        'metricas': {
          'horas_live': null,
          'gmv': null,
          'gmv_por_hora': null,
          'pct_meta_hora': null,
          'comissao_livelab_total': null,
          'comissao_apresentadora_total': null,
          'comissao_por_hora': null,
          'funil': null,
        },
        'status': {
          'status': 'dados_incompletos',
          'motivos': [],
        },
        'alertas': [],
      };

      final op = ClienteOperacional.fromJson(json);

      expect(op.metricas.gmvPorHora, isNull);
      expect(op.metricas.horasLive, isNull);
      expect(op.metricas.comissaoLivelabTotal, isNull);
      expect(op.metricas.pctMetaHora, isNull);
      expect(op.config.metaGmvHora, isNull);
      expect(op.status.status, 'dados_incompletos');
      expect(op.alertas, isEmpty);
    });

    test('campos com valores são parseados corretamente', () {
      final json = <String, dynamic>{
        'periodo': '2026-06',
        'config': {
          'meta_gmv_hora': 500.0,
          'margem_pct': 30.0,
          'comissao_livelab_pct': 8.5,
        },
        'metricas': {
          'horas_live': 12.5,
          'gmv': 6250.0,
          'gmv_por_hora': 500.0,
          'pct_meta_hora': 100.0,
          'comissao_livelab_total': 531.25,
          'comissao_apresentadora_total': 250.0,
          'comissao_por_hora': 42.5,
          'funil': {'views': 10000, 'clicks': 800, 'pedidos': 120},
        },
        'status': {
          'status': 'ok',
          'motivos': [],
          'diagnostico': 'Meta atingida',
          'proxima_acao': 'Manter ritmo',
        },
        'alertas': [
          {
            'live_id': 'live-abc',
            'tipo': 'gmv_baixo',
            'descricao': 'GMV abaixo da meta',
            'data': '2026-06-01',
          }
        ],
      };

      final op = ClienteOperacional.fromJson(json);

      expect(op.metricas.gmvPorHora, 500.0);
      expect(op.metricas.horasLive, 12.5);
      expect(op.metricas.pctMetaHora, 100.0);
      expect(op.metricas.funil?.views, 10000);
      expect(op.metricas.funil?.clicks, 800);
      expect(op.metricas.funil?.pedidos, 120);
      expect(op.config.metaGmvHora, 500.0);
      expect(op.status.status, 'ok');
      expect(op.status.diagnostico, 'Meta atingida');
      expect(op.alertas.length, 1);
      expect(op.alertas.first.tipo, 'gmv_baixo');
    });
  });

  // -----------------------------------------------------------------------
  // SessaoLive.fromJson — nulls preservados
  // -----------------------------------------------------------------------
  group('SessaoLive.fromJson', () {
    test('campos null preservam null', () {
      final json = <String, dynamic>{
        'live_id': 'live-001',
        'data': null,
        'inicio': null,
        'fim': null,
        'apresentadora': null,
        'horas': null,
        'gmv': null,
        'pedidos': null,
        'views': null,
        'clicks': null,
        'gmv_por_hora': null,
        'pedidos_por_hora': null,
        'comissao_livelab': null,
        'comissao_apresentadora': null,
        'comissao_apresentadora_pct': null,
        'fim_de_semana': false,
        'status_operacional': 'dados_incompletos',
        'motivos': [],
      };

      final s = SessaoLive.fromJson(json);

      expect(s.liveId, 'live-001');
      expect(s.horas, isNull);
      expect(s.gmv, isNull);
      expect(s.gmvPorHora, isNull);
      expect(s.comissaoLivelab, isNull);
      expect(s.comissaoApresentadora, isNull);
      expect(s.apresentadora, isNull);
      expect(s.fimDeSemana, isFalse);
    });

    test('fim_de_semana=true é preservado', () {
      final json = <String, dynamic>{
        'live_id': 'live-002',
        'fim_de_semana': true,
        'status_operacional': 'ok',
        'comissao_apresentadora': 312.5,
        'comissao_apresentadora_pct': 2.0,
      };

      final s = SessaoLive.fromJson(json);
      expect(s.fimDeSemana, isTrue);
      expect(s.comissaoApresentadora, 312.5);
      expect(s.comissaoApresentadoraPct, 2.0);
    });

    test('status_operacional ausente default para dados_incompletos', () {
      final json = <String, dynamic>{
        'live_id': 'live-003',
        'status_operacional': '',
      };
      final s = SessaoLive.fromJson(json);
      expect(s.statusOperacional, 'dados_incompletos');
    });
  });
}
