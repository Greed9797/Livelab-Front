import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/models/knowledge_category.dart';

void main() {
  group('KnowledgeCategory.fromJson', () {
    test('parses core fields without article_count', () {
      final cat = KnowledgeCategory.fromJson({
        'id': 'c1',
        'name': 'Ops',
        'slug': 'ops',
        'sort_order': 2,
        'is_active': true,
      });
      expect(cat.id, 'c1');
      expect(cat.name, 'Ops');
      expect(cat.slug, 'ops');
      expect(cat.sortOrder, 2);
      expect(cat.isActive, isTrue);
      expect(cat.articleCount, isNull);
    });

    test('parses optional article_count from Back #15', () {
      final cat = KnowledgeCategory.fromJson({
        'id': 'c2',
        'name': 'Onboarding',
        'slug': 'onboarding',
        'article_count': 4,
      });
      expect(cat.articleCount, 4);
    });
  });
}
