/// Provider de vídeo embutido em um artigo.
enum KbVideoProvider { youtube, panda, none }

KbVideoProvider _parseProvider(dynamic v) {
  final s = (v as String?)?.toLowerCase();
  switch (s) {
    case 'youtube':
      return KbVideoProvider.youtube;
    case 'panda':
      return KbVideoProvider.panda;
    default:
      return KbVideoProvider.none;
  }
}

String kbVideoProviderToString(KbVideoProvider p) {
  switch (p) {
    case KbVideoProvider.youtube:
      return 'youtube';
    case KbVideoProvider.panda:
      return 'panda';
    case KbVideoProvider.none:
      return 'none';
  }
}

/// Status de publicação do artigo.
enum KbArticleStatus { draft, published, archived }

KbArticleStatus _parseStatus(dynamic v) {
  final s = (v as String?)?.toLowerCase();
  switch (s) {
    case 'published':
      return KbArticleStatus.published;
    case 'archived':
      return KbArticleStatus.archived;
    default:
      return KbArticleStatus.draft;
  }
}

String kbArticleStatusToString(KbArticleStatus s) {
  switch (s) {
    case KbArticleStatus.published:
      return 'published';
    case KbArticleStatus.archived:
      return 'archived';
    case KbArticleStatus.draft:
      return 'draft';
  }
}

/// Artigo da Base de Conhecimento (Knowledge Base).
///
/// Espelha o schema retornado por GET /v1/knowledge/articles.
class KnowledgeArticle {
  final String id;
  final String titulo;
  final String slug;
  final String? excerpt;
  final String contentMarkdown;
  final String? coverImageUrl;
  final KbVideoProvider videoProvider;
  final String? videoUrl;
  final List<String> tags;
  final KbArticleStatus status;
  final int sortOrder;
  final int? estimatedReadMinutes;
  final DateTime? publishedAt;
  final DateTime? atualizadoEm;
  final String? url; // legacy
  final String? categoria; // legacy TEXT
  final int? paginas;
  final bool destaque;
  final String? categoryId;
  final String? categoryName;
  final String? categorySlug;

  const KnowledgeArticle({
    required this.id,
    required this.titulo,
    required this.slug,
    this.excerpt,
    this.contentMarkdown = '',
    this.coverImageUrl,
    this.videoProvider = KbVideoProvider.none,
    this.videoUrl,
    this.tags = const [],
    this.status = KbArticleStatus.draft,
    this.sortOrder = 0,
    this.estimatedReadMinutes,
    this.publishedAt,
    this.atualizadoEm,
    this.url,
    this.categoria,
    this.paginas,
    this.destaque = false,
    this.categoryId,
    this.categoryName,
    this.categorySlug,
  });

  factory KnowledgeArticle.fromJson(Map<String, dynamic> j) {
    DateTime? parseDate(dynamic v) {
      if (v is String && v.isNotEmpty) return DateTime.tryParse(v);
      return null;
    }

    return KnowledgeArticle(
      id: j['id'] as String,
      titulo: (j['titulo'] as String?) ?? '',
      slug: (j['slug'] as String?) ?? '',
      excerpt: j['excerpt'] as String?,
      contentMarkdown: (j['content_markdown'] as String?) ?? '',
      coverImageUrl: j['cover_image_url'] as String?,
      videoProvider: _parseProvider(j['video_provider']),
      videoUrl: j['video_url'] as String?,
      tags: (j['tags'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      status: _parseStatus(j['status']),
      sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      estimatedReadMinutes:
          (j['estimated_read_minutes'] as num?)?.toInt(),
      publishedAt: parseDate(j['published_at']),
      atualizadoEm: parseDate(j['atualizado_em']),
      url: j['url'] as String?,
      categoria: j['categoria'] as String?,
      paginas: (j['paginas'] as num?)?.toInt(),
      destaque: j['destaque'] == true,
      categoryId: j['category_id'] as String?,
      categoryName: j['category_name'] as String?,
      categorySlug: j['category_slug'] as String?,
    );
  }

  KnowledgeArticle copyWith({
    String? titulo,
    String? slug,
    String? excerpt,
    String? contentMarkdown,
    String? coverImageUrl,
    KbVideoProvider? videoProvider,
    String? videoUrl,
    List<String>? tags,
    KbArticleStatus? status,
    int? sortOrder,
    int? estimatedReadMinutes,
    bool? destaque,
    String? categoryId,
    String? categoryName,
    String? categorySlug,
  }) {
    return KnowledgeArticle(
      id: id,
      titulo: titulo ?? this.titulo,
      slug: slug ?? this.slug,
      excerpt: excerpt ?? this.excerpt,
      contentMarkdown: contentMarkdown ?? this.contentMarkdown,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      videoProvider: videoProvider ?? this.videoProvider,
      videoUrl: videoUrl ?? this.videoUrl,
      tags: tags ?? this.tags,
      status: status ?? this.status,
      sortOrder: sortOrder ?? this.sortOrder,
      estimatedReadMinutes:
          estimatedReadMinutes ?? this.estimatedReadMinutes,
      publishedAt: publishedAt,
      atualizadoEm: atualizadoEm,
      url: url,
      categoria: categoria,
      paginas: paginas,
      destaque: destaque ?? this.destaque,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      categorySlug: categorySlug ?? this.categorySlug,
    );
  }
}
