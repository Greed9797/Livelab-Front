import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/knowledge_article.dart';
import '../models/knowledge_category.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// ═══════════════════════════════════════════════════════════════════
// 🗂️ Categorias
// ═══════════════════════════════════════════════════════════════════

class KnowledgeCategoriesNotifier
    extends AsyncNotifier<List<KnowledgeCategory>> {
  @override
  Future<List<KnowledgeCategory>> build() async {
    final auth = ref.watch(authProvider);
    if (!auth.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    return _fetch();
  }

  Future<List<KnowledgeCategory>> _fetch() async {
    final resp = await ApiService.get<dynamic>('/knowledge/categories');
    final raw = resp.data;
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(KnowledgeCategory.fromJson)
          .toList();
    }
    return const [];
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<KnowledgeCategory> criar(Map<String, dynamic> payload) async {
    final resp = await ApiService.post<dynamic>(
      '/knowledge/categories',
      data: payload,
    );
    final created =
        KnowledgeCategory.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([...(state.valueOrNull ?? const []), created]);
    return created;
  }

  Future<KnowledgeCategory> editar(
      String id, Map<String, dynamic> payload) async {
    final resp = await ApiService.patch<dynamic>(
      '/knowledge/categories/$id',
      data: payload,
    );
    final updated =
        KnowledgeCategory.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? const [])
          .map((c) => c.id == id ? updated : c)
          .toList(),
    );
    return updated;
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/knowledge/categories/$id');
    state = AsyncData(
      (state.valueOrNull ?? const []).where((c) => c.id != id).toList(),
    );
  }

  /// Reordena categorias atualizando sort_order (1-indexed) na ordem do array.
  /// Otimista: atualiza state imediatamente, faz rollback em caso de erro.
  Future<void> reordenar(List<String> orderedIds) async {
    final current = state.valueOrNull ?? const <KnowledgeCategory>[];
    final byId = {for (final c in current) c.id: c};
    final reordered = <KnowledgeCategory>[
      for (final id in orderedIds)
        if (byId.containsKey(id)) byId[id]!,
    ];
    // defensivo: itens fora do array (não deveria) ficam ao final
    for (final c in current) {
      if (!orderedIds.contains(c.id)) reordered.add(c);
    }
    state = AsyncData(reordered);
    try {
      await ApiService.post<dynamic>(
        '/knowledge/categories/reorder',
        data: {'ids': orderedIds},
      );
    } catch (e) {
      // rollback
      state = AsyncData(current);
      rethrow;
    }
  }
}

final knowledgeCategoriesProvider = AsyncNotifierProvider<
    KnowledgeCategoriesNotifier,
    List<KnowledgeCategory>>(KnowledgeCategoriesNotifier.new);

// ═══════════════════════════════════════════════════════════════════
// 📚 Artigos (listagem com filtros)
// ═══════════════════════════════════════════════════════════════════

class KnowledgeArticlesFilter {
  final String? categorySlug;
  final String? status; // 'draft' | 'published' | 'archived' | null = todos
  final String? q;

  const KnowledgeArticlesFilter({
    this.categorySlug,
    this.status,
    this.q,
  });

  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (categorySlug != null && categorySlug!.isNotEmpty) {
      params['category'] = categorySlug;
    }
    if (status != null && status!.isNotEmpty) params['status'] = status;
    if (q != null && q!.isNotEmpty) params['q'] = q;
    return params;
  }
}

class KnowledgeArticlesFilterNotifier
    extends Notifier<KnowledgeArticlesFilter> {
  @override
  KnowledgeArticlesFilter build() => const KnowledgeArticlesFilter();

  void update({String? categorySlug, String? status, String? q}) {
    state = KnowledgeArticlesFilter(
      categorySlug: categorySlug ?? state.categorySlug,
      status: status ?? state.status,
      q: q ?? state.q,
    );
  }

  void clear() => state = const KnowledgeArticlesFilter();

  void setCategory(String? slug) =>
      state = KnowledgeArticlesFilter(
        categorySlug: slug,
        status: state.status,
        q: state.q,
      );

  void setStatus(String? status) =>
      state = KnowledgeArticlesFilter(
        categorySlug: state.categorySlug,
        status: status,
        q: state.q,
      );
}

final knowledgeArticlesFilterProvider = NotifierProvider<
    KnowledgeArticlesFilterNotifier,
    KnowledgeArticlesFilter>(KnowledgeArticlesFilterNotifier.new);

class KnowledgeArticlesNotifier
    extends AsyncNotifier<List<KnowledgeArticle>> {
  @override
  Future<List<KnowledgeArticle>> build() async {
    final auth = ref.watch(authProvider);
    if (!auth.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final filter = ref.watch(knowledgeArticlesFilterProvider);
    return _fetch(filter);
  }

  Future<List<KnowledgeArticle>> _fetch(
      KnowledgeArticlesFilter filter) async {
    final resp = await ApiService.get<dynamic>(
      '/knowledge/articles',
      params: filter.toQueryParams(),
    );
    final raw = resp.data;
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(KnowledgeArticle.fromJson)
          .toList();
    }
    return const [];
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _fetch(ref.read(knowledgeArticlesFilterProvider)),
    );
  }

  Future<KnowledgeArticle> criar(Map<String, dynamic> payload) async {
    final resp = await ApiService.post<dynamic>(
      '/knowledge/articles',
      data: payload,
    );
    final created =
        KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData([created, ...(state.valueOrNull ?? const [])]);
    return created;
  }

  Future<KnowledgeArticle> editar(
      String id, Map<String, dynamic> payload) async {
    final resp = await ApiService.patch<dynamic>(
      '/knowledge/articles/$id',
      data: payload,
    );
    final updated =
        KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? const [])
          .map((a) => a.id == id ? updated : a)
          .toList(),
    );
    return updated;
  }

  Future<KnowledgeArticle> publicar(String id) async {
    final resp = await ApiService.post<dynamic>(
      '/knowledge/articles/$id/publish',
    );
    final updated =
        KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? const [])
          .map((a) => a.id == id ? updated : a)
          .toList(),
    );
    return updated;
  }

  Future<KnowledgeArticle> arquivar(String id) async {
    final resp = await ApiService.post<dynamic>(
      '/knowledge/articles/$id/archive',
    );
    final updated =
        KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
    state = AsyncData(
      (state.valueOrNull ?? const [])
          .map((a) => a.id == id ? updated : a)
          .toList(),
    );
    return updated;
  }

  Future<void> deletar(String id) async {
    await ApiService.delete('/knowledge/articles/$id');
    state = AsyncData(
      (state.valueOrNull ?? const []).where((a) => a.id != id).toList(),
    );
  }
}

final knowledgeArticlesProvider = AsyncNotifierProvider<
    KnowledgeArticlesNotifier,
    List<KnowledgeArticle>>(KnowledgeArticlesNotifier.new);

// ═══════════════════════════════════════════════════════════════════
// 🔎 Search
// ═══════════════════════════════════════════════════════════════════

class KnowledgeSearchNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<KnowledgeArticle>, String> {
  @override
  Future<List<KnowledgeArticle>> build(String q) async {
    final query = q.trim();
    if (query.length < 2) return const [];
    final resp = await ApiService.get<dynamic>(
      '/knowledge/search',
      params: {'q': query},
    );
    final raw = resp.data;
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(KnowledgeArticle.fromJson)
          .toList();
    }
    return const [];
  }
}

final knowledgeSearchProvider = AsyncNotifierProvider.autoDispose
    .family<KnowledgeSearchNotifier, List<KnowledgeArticle>, String>(
  KnowledgeSearchNotifier.new,
);

// ═══════════════════════════════════════════════════════════════════
// 📄 Artigo por slug
// ═══════════════════════════════════════════════════════════════════

class KnowledgeArticleBySlugNotifier
    extends FamilyAsyncNotifier<KnowledgeArticle, String> {
  @override
  Future<KnowledgeArticle> build(String slug) async {
    final auth = ref.watch(authProvider);
    if (!auth.isAuthenticated) {
      throw Exception('Não autenticado');
    }
    final resp = await ApiService.get<dynamic>(
      '/knowledge/articles/$slug',
    );
    return KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final resp = await ApiService.get<dynamic>(
        '/knowledge/articles/$arg',
      );
      return KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
    });
  }
}

final knowledgeArticleBySlugProvider = AsyncNotifierProvider.family<
    KnowledgeArticleBySlugNotifier,
    KnowledgeArticle,
    String>(KnowledgeArticleBySlugNotifier.new);
