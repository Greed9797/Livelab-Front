/// Categoria da Base de Conhecimento (Knowledge Base).
///
/// Espelha o schema retornado por GET /v1/knowledge/categories.
class KnowledgeCategory {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? icon;
  final int sortOrder;
  final bool isActive;

  const KnowledgeCategory({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.icon,
    this.sortOrder = 0,
    this.isActive = true,
  });

  factory KnowledgeCategory.fromJson(Map<String, dynamic> j) {
    return KnowledgeCategory(
      id: j['id'] as String,
      name: (j['name'] as String?) ?? '',
      slug: (j['slug'] as String?) ?? '',
      description: j['description'] as String?,
      icon: j['icon'] as String?,
      sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      isActive: j['is_active'] != false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'slug': slug,
        'description': description,
        'icon': icon,
        'sort_order': sortOrder,
        'is_active': isActive,
      };
}
