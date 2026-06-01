import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/models/lead.dart';

void main() {
  test('Lead.fromJson parses CRM MVP fields', () {
    final lead = Lead.fromJson({
      'id': 'lead-1',
      'nome': 'Loja Alpha',
      'nicho': 'Moda',
      'cidade': 'Curitiba',
      'estado': 'PR',
      'lat': '1.5',
      'lng': '-2.5',
      'fat_estimado': '10000.00',
      'status': 'pego',
      'pego_por': 'tenant-1',
      'pego_em': '2026-04-25T10:00:00.000Z',
      'expira_em': null,
      'criado_em': '2026-04-25T10:00:00.000Z',
      'is_novo': true,
      'crm_etapa': 'em_negociacao',
      'valor_oportunidade': '12000.50',
      'responsavel_nome': 'Camila',
      'origem': 'SDR',
      'historico_contatos': [
        {'texto': 'Ligacao inicial'}
      ],
      'observacoes_internas': 'Tem fit',
      'tarefas': [
        {'titulo': 'Enviar proposta'}
      ],
      'motivo_perda': null,
      'atualizado_em': '2026-04-25T11:00:00.000Z',
    });

    expect(lead.crmEtapa, 'em_negociacao');
    expect(lead.valorOportunidade, 12000.50);
    expect(lead.responsavelNome, 'Camila');
    expect(lead.origem, 'SDR');
    expect(lead.historicoContatos.single['texto'], 'Ligacao inicial');
    expect(lead.tarefas.single['titulo'], 'Enviar proposta');
    expect(lead.atualizadoEm, isNotNull);
  });
}
