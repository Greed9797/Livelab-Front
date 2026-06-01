import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/models/pacote.dart';

void main() {
  group('Pacote.fromJson', () {
    test('accepts numeric strings returned by Postgres NUMERIC fields', () {
      final pacote = Pacote.fromJson({
        'id': 'pacote-1',
        'nome': 'Plano Growth',
        'descricao': 'Teste',
        'valor': '2499.90',
        'valor_fixo': '2499.90',
        'horas_incluidas': '12.50',
        'comissao_pct': '8.75',
        'ativo': true,
      });

      expect(pacote.valor, 2499.90);
      expect(pacote.valorFixo, 2499.90);
      expect(pacote.horasIncluidas, 12.50);
      expect(pacote.comissaoPct, 8.75);
    });

    test('keeps accepting numeric values', () {
      final pacote = Pacote.fromJson({
        'id': 'pacote-2',
        'nome': 'Plano Base',
        'valor': 1200,
        'horas_incluidas': 8,
        'comissao_pct': 5,
        'ativo': true,
      });

      expect(pacote.valor, 1200);
      expect(pacote.horasIncluidas, 8);
      expect(pacote.comissaoPct, 5);
    });

    test('falls back to legacy valor when valor_fixo is absent', () {
      final pacote = Pacote.fromJson({
        'id': 'pacote-3',
        'nome': 'Plano Legado',
        'valor': '900.00',
        'horas_incluidas': '6',
        'ativo': true,
      });

      expect(pacote.valorFixo, 900);
      expect(pacote.comissaoPct, 0);
    });
  });
}
