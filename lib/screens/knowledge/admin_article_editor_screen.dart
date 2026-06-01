import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/design_system.dart';
import '../../models/knowledge_article.dart';
import '../../models/knowledge_category.dart';
import '../../providers/knowledge_provider.dart';
import '../../routes/app_routes.dart';
import '../../services/api_service.dart';
import '../../widgets/knowledge/markdown_renderer.dart';
import '../../widgets/knowledge/video_block.dart';

class AdminArticleEditorScreen extends ConsumerStatefulWidget {
  /// Pode ser passado quando navegando para edição. Se null, é criação.
  final KnowledgeArticle? article;
  final String? articleId;

  const AdminArticleEditorScreen({
    super.key,
    this.article,
    this.articleId,
  });

  @override
  ConsumerState<AdminArticleEditorScreen> createState() =>
      _AdminArticleEditorScreenState();
}

class _AdminArticleEditorScreenState
    extends ConsumerState<AdminArticleEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _tituloCtrl;
  late final TextEditingController _excerptCtrl;
  late final TextEditingController _contentCtrl;
  late final TextEditingController _videoUrlCtrl;
  late final TextEditingController _coverUrlCtrl;
  late final TextEditingController _tagsCtrl;
  late final TextEditingController _sortOrderCtrl;

  String? _categoryId;
  KbVideoProvider _videoProvider = KbVideoProvider.none;
  KbArticleStatus _status = KbArticleStatus.draft;
  bool _destaque = false;
  bool _saving = false;
  bool _uploadingCover = false;
  KnowledgeArticle? _loaded;

  @override
  void initState() {
    super.initState();
    final a = widget.article;
    _tituloCtrl = TextEditingController(text: a?.titulo ?? '');
    _excerptCtrl = TextEditingController(text: a?.excerpt ?? '');
    _contentCtrl = TextEditingController(text: a?.contentMarkdown ?? '');
    _videoUrlCtrl = TextEditingController(text: a?.videoUrl ?? '');
    _coverUrlCtrl = TextEditingController(text: a?.coverImageUrl ?? '');
    _tagsCtrl = TextEditingController(text: a?.tags.join(', ') ?? '');
    _sortOrderCtrl =
        TextEditingController(text: (a?.sortOrder ?? 0).toString());
    _categoryId = a?.categoryId;
    _videoProvider = a?.videoProvider ?? KbVideoProvider.none;
    _status = a?.status ?? KbArticleStatus.draft;
    _destaque = a?.destaque ?? false;
    _loaded = a;

    // Se entramos via /editar/:id sem objeto pré-carregado, fazer fetch.
    if (a == null && widget.articleId != null) {
      _loadById(widget.articleId!);
    }
  }

  Future<void> _loadById(String id) async {
    try {
      // Estratégia: pegar lista (já tem cache) ou fetch by slug não dá pra id;
      // o backend tem /v1/knowledge/articles/:idOrSlug → o helper aceita id.
      final resp = await ApiService.get<dynamic>('/knowledge/articles/$id');
      final article =
          KnowledgeArticle.fromJson(resp.data as Map<String, dynamic>);
      if (!mounted) return;
      setState(() {
        _loaded = article;
        _tituloCtrl.text = article.titulo;
        _excerptCtrl.text = article.excerpt ?? '';
        _contentCtrl.text = article.contentMarkdown;
        _videoUrlCtrl.text = article.videoUrl ?? '';
        _coverUrlCtrl.text = article.coverImageUrl ?? '';
        _tagsCtrl.text = article.tags.join(', ');
        _sortOrderCtrl.text = article.sortOrder.toString();
        _categoryId = article.categoryId;
        _videoProvider = article.videoProvider;
        _status = article.status;
        _destaque = article.destaque;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Erro ao carregar artigo: ${ApiService.extractErrorMessage(e)}')),
      );
    }
  }

  @override
  void dispose() {
    _tituloCtrl.dispose();
    _excerptCtrl.dispose();
    _contentCtrl.dispose();
    _videoUrlCtrl.dispose();
    _coverUrlCtrl.dispose();
    _tagsCtrl.dispose();
    _sortOrderCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildPayload({KbArticleStatus? overrideStatus}) {
    final tags = _tagsCtrl.text
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    return {
      'titulo': _tituloCtrl.text.trim(),
      'excerpt': _excerptCtrl.text.trim(),
      'content_markdown': _contentCtrl.text,
      'category_id': _categoryId,
      'video_provider': kbVideoProviderToString(_videoProvider),
      'video_url': _videoUrlCtrl.text.trim().isEmpty
          ? null
          : _videoUrlCtrl.text.trim(),
      'cover_image_url': _coverUrlCtrl.text.trim().isEmpty
          ? null
          : _coverUrlCtrl.text.trim(),
      'tags': tags,
      'status':
          kbArticleStatusToString(overrideStatus ?? _status),
      'destaque': _destaque,
      'sort_order': int.tryParse(_sortOrderCtrl.text.trim()) ?? 0,
    };
  }

  /// Retorna os bytes da imagem prontos para upload (max 2 MB).
  /// image_picker já aplica quality:80 e maxWidth:1600 ao selecionar.
  /// Quando flutter_image_compress for adicionado ao pubspec, pode-se
  /// substituir por FlutterImageCompress.compressWithList para maior controle.
  Future<Uint8List> _prepareImageBytes(Uint8List original) async {
    return original;
  }

  Future<void> _pickAndUploadCover() async {
    final picker = ImagePicker();
    final XFile? picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (picked == null) return;
    setState(() => _uploadingCover = true);
    try {
      final bytes = await picked.readAsBytes();
      final compressed = await _prepareImageBytes(bytes);

      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          compressed,
          filename: picked.name,
          contentType: DioMediaType.parse(
            picked.mimeType ?? 'image/jpeg',
          ),
        ),
      });

      final resp = await ApiService.postFormData(
        '/knowledge/upload-cover',
        formData: formData,
      );
      final url = (resp.data as Map<String, dynamic>)['url'] as String?;
      if (url != null && mounted) {
        setState(() => _coverUrlCtrl.text = url);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Imagem de capa carregada')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Erro ao fazer upload: ${ApiService.extractErrorMessage(e)}',
          ),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _uploadingCover = false);
    }
  }

  Future<void> _save({required bool publish}) async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione uma categoria')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final notifier = ref.read(knowledgeArticlesProvider.notifier);
      final payload = _buildPayload(
        overrideStatus: publish ? KbArticleStatus.published : _status,
      );
      final id = _loaded?.id ?? widget.articleId;
      KnowledgeArticle saved;
      if (id != null) {
        saved = await notifier.editar(id, payload);
        if (publish && saved.status != KbArticleStatus.published) {
          saved = await notifier.publicar(id);
        }
      } else {
        saved = await notifier.criar(payload);
        if (publish && saved.status != KbArticleStatus.published) {
          saved = await notifier.publicar(saved.id);
        }
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(publish ? 'Artigo publicado' : 'Rascunho salvo'),
        ),
      );
      // Volta para lista (home) — invalidar caches relacionados.
      ref.invalidate(knowledgeArticleBySlugProvider(saved.slug));
      Navigator.of(context).pushReplacementNamed(
        '${AppRoutes.knowledgeArticle}/${saved.slug}',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Erro ao salvar: ${ApiService.extractErrorMessage(e)}'),
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(knowledgeCategoriesProvider);
    final isEditing = _loaded != null || widget.articleId != null;

    return AppScreenScaffold(
      currentRoute: AppRoutes.knowledgeBase,
      eyebrow: 'EDITOR',
      title: isEditing ? 'Editar artigo' : 'Novo artigo',
      actions: [
        AppGhostButton(
          label: 'Cancelar',
          onPressed: _saving ? null : () => Navigator.of(context).maybePop(),
        ),
        const SizedBox(width: AppSpacing.x2),
        AppSecondaryButton(
          label: 'Salvar rascunho',
          icon: PhosphorIcons.floppyDisk(),
          onPressed: _saving ? null : () => _save(publish: false),
        ),
        const SizedBox(width: AppSpacing.x2),
        AppPrimaryButton(
          label: 'Salvar e publicar',
          icon: PhosphorIcons.uploadSimple(),
          isLoading: _saving,
          onPressed: _saving ? null : () => _save(publish: true),
        ),
      ],
      child: Form(
        key: _formKey,
        child: LayoutBuilder(builder: (context, constraints) {
          final wide = constraints.maxWidth >= 1100;
          final formCol = _FormColumn(
            tituloCtrl: _tituloCtrl,
            excerptCtrl: _excerptCtrl,
            contentCtrl: _contentCtrl,
            videoUrlCtrl: _videoUrlCtrl,
            coverUrlCtrl: _coverUrlCtrl,
            tagsCtrl: _tagsCtrl,
            sortOrderCtrl: _sortOrderCtrl,
            categoryId: _categoryId,
            videoProvider: _videoProvider,
            status: _status,
            destaque: _destaque,
            categoriesAsync: categoriesAsync,
            uploadingCover: _uploadingCover,
            onPickCover: _pickAndUploadCover,
            onCategoryChanged: (id) => setState(() => _categoryId = id),
            onVideoProviderChanged: (p) =>
                setState(() => _videoProvider = p),
            onStatusChanged: (s) => setState(() => _status = s),
            onDestaqueChanged: (v) => setState(() => _destaque = v),
          );

          final preview = _PreviewColumn(
            titulo: _tituloCtrl,
            excerpt: _excerptCtrl,
            content: _contentCtrl,
            videoProvider: _videoProvider,
            videoUrl: _videoUrlCtrl,
          );

          if (!wide) {
            return DefaultTabController(
              length: 2,
              child: Column(
                children: [
                  Container(
                    color: AppColors.bgCard,
                    child: const TabBar(
                      labelColor: AppColors.textPrimary,
                      unselectedLabelColor: AppColors.textMuted,
                      indicatorColor: AppColors.primary,
                      tabs: [
                        Tab(text: 'Editor'),
                        Tab(text: 'Pré-visualização'),
                      ],
                    ),
                  ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        SingleChildScrollView(
                          padding: const EdgeInsets.all(AppSpacing.x6),
                          child: formCol,
                        ),
                        SingleChildScrollView(
                          padding: const EdgeInsets.all(AppSpacing.x6),
                          child: preview,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 5,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpacing.x6),
                  child: formCol,
                ),
              ),
              const VerticalDivider(
                  color: AppColors.borderLight, width: 1),
              Expanded(
                flex: 5,
                child: Container(
                  color: AppColors.bgBase,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.x6),
                    child: preview,
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}

class _FormColumn extends StatelessWidget {
  final TextEditingController tituloCtrl;
  final TextEditingController excerptCtrl;
  final TextEditingController contentCtrl;
  final TextEditingController videoUrlCtrl;
  final TextEditingController coverUrlCtrl;
  final TextEditingController tagsCtrl;
  final TextEditingController sortOrderCtrl;
  final String? categoryId;
  final KbVideoProvider videoProvider;
  final KbArticleStatus status;
  final bool destaque;
  final AsyncValue<List<KnowledgeCategory>> categoriesAsync;
  final bool uploadingCover;
  final VoidCallback onPickCover;
  final ValueChanged<String?> onCategoryChanged;
  final ValueChanged<KbVideoProvider> onVideoProviderChanged;
  final ValueChanged<KbArticleStatus> onStatusChanged;
  final ValueChanged<bool> onDestaqueChanged;

  const _FormColumn({
    required this.tituloCtrl,
    required this.excerptCtrl,
    required this.contentCtrl,
    required this.videoUrlCtrl,
    required this.coverUrlCtrl,
    required this.tagsCtrl,
    required this.sortOrderCtrl,
    required this.categoryId,
    required this.videoProvider,
    required this.status,
    required this.destaque,
    required this.categoriesAsync,
    required this.uploadingCover,
    required this.onPickCover,
    required this.onCategoryChanged,
    required this.onVideoProviderChanged,
    required this.onStatusChanged,
    required this.onDestaqueChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label('Título'),
        TextFormField(
          controller: tituloCtrl,
          style: AppTypography.h3,
          validator: (v) =>
              (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
          decoration: const InputDecoration(
            hintText: 'Como organizar uma live de sucesso',
          ),
        ),
        const SizedBox(height: AppSpacing.x5),

        _Label('Categoria'),
        categoriesAsync.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text('Erro: $e',
              style: AppTypography.bodySmall
                  .copyWith(color: AppColors.danger)),
          data: (categories) {
            final items = categories
                .map((c) => DropdownMenuItem<String>(
                      value: c.id,
                      child: Text(c.name),
                    ))
                .toList();
            return DropdownButtonFormField<String>(
              value: categoryId,
              items: items,
              onChanged: onCategoryChanged,
              decoration: const InputDecoration(
                hintText: 'Selecione uma categoria',
              ),
              validator: (v) => v == null ? 'Selecione uma categoria' : null,
            );
          },
        ),
        const SizedBox(height: AppSpacing.x5),

        _Label('Resumo (excerpt)'),
        TextFormField(
          controller: excerptCtrl,
          maxLines: 3,
          style: AppTypography.bodyMedium,
          decoration: const InputDecoration(
            hintText: 'Uma frase curta que aparece nos cards.',
          ),
        ),
        const SizedBox(height: AppSpacing.x5),

        _Label('Status'),
        AppSegmentedControl<KbArticleStatus>(
          segments: const [
            KbArticleStatus.draft,
            KbArticleStatus.published,
            KbArticleStatus.archived,
          ],
          selected: status,
          labelOf: (s) {
            switch (s) {
              case KbArticleStatus.draft:
                return 'Rascunho';
              case KbArticleStatus.published:
                return 'Publicado';
              case KbArticleStatus.archived:
                return 'Arquivado';
            }
          },
          onChanged: onStatusChanged,
        ),
        const SizedBox(height: AppSpacing.x5),

        _Label('Vídeo'),
        AppSegmentedControl<KbVideoProvider>(
          segments: const [
            KbVideoProvider.none,
            KbVideoProvider.youtube,
            KbVideoProvider.panda,
          ],
          selected: videoProvider,
          labelOf: (p) {
            switch (p) {
              case KbVideoProvider.none:
                return 'Sem vídeo';
              case KbVideoProvider.youtube:
                return 'YouTube';
              case KbVideoProvider.panda:
                return 'Panda';
            }
          },
          onChanged: onVideoProviderChanged,
        ),
        if (videoProvider != KbVideoProvider.none) ...[
          const SizedBox(height: AppSpacing.x3),
          TextFormField(
            controller: videoUrlCtrl,
            style: AppTypography.bodyMedium,
            decoration: InputDecoration(
              hintText: videoProvider == KbVideoProvider.youtube
                  ? 'https://youtube.com/watch?v=…'
                  : 'https://player-vz-… (Panda)',
              prefixIcon:
                  Icon(PhosphorIcons.link(), size: 18, color: AppColors.textMuted),
            ),
            autovalidateMode: AutovalidateMode.onUserInteraction,
            validator: (v) {
              final s = (v ?? '').trim();
              if (s.isEmpty) return 'URL obrigatória pra este provider';
              final uri = Uri.tryParse(s);
              if (uri == null || !uri.hasAbsolutePath || uri.host.isEmpty) {
                return 'URL inválida';
              }
              if (videoProvider == KbVideoProvider.youtube) {
                final ok = uri.host.contains('youtube.com') ||
                    uri.host.contains('youtu.be');
                if (!ok) return 'Deve ser link do YouTube';
              } else if (videoProvider == KbVideoProvider.panda) {
                final ok = uri.host.contains('pandavideo.com') ||
                    uri.host.contains('tv.pandavideo') ||
                    uri.host.contains('player-vz');
                if (!ok) return 'Deve ser link do Panda Video';
              }
              return null;
            },
          ),
        ],
        const SizedBox(height: AppSpacing.x5),

        _Label('Imagem de capa'),
        // Preview da imagem carregada (se houver URL)
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: coverUrlCtrl,
          builder: (context, value, _) {
            final url = value.text.trim();
            if (url.isEmpty) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.x3),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Image.network(
                  url,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.bgMuted,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(PhosphorIcons.warning(), size: 16, color: AppColors.textMuted),
                        const SizedBox(width: AppSpacing.x2),
                        Text('URL inválida ou imagem indisponível',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted)),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        // Botão de upload
        Material(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: InkWell(
            onTap: uploadingCover ? null : onPickCover,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.x5,
                vertical: AppSpacing.x4,
              ),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.borderLight),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (uploadingCover)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primary,
                      ),
                    )
                  else
                    Icon(PhosphorIcons.uploadSimple(),
                        size: 18, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.x2),
                  Text(
                    uploadingCover ? 'Enviando...' : 'Selecionar imagem',
                    style: AppTypography.bodyMedium.copyWith(
                      color: uploadingCover
                          ? AppColors.textMuted
                          : AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.x3),
        // Fallback: campo URL manual
        TextFormField(
          controller: coverUrlCtrl,
          style: AppTypography.bodyMedium,
          decoration: InputDecoration(
            hintText: 'Ou cole uma URL diretamente (opcional)',
            prefixIcon:
                Icon(PhosphorIcons.link(), size: 18, color: AppColors.textMuted),
          ),
        ),
        const SizedBox(height: AppSpacing.x5),

        _Label('Tags (separadas por vírgula)'),
        TextFormField(
          controller: tagsCtrl,
          style: AppTypography.bodyMedium,
          decoration: const InputDecoration(
            hintText: 'tiktok, live, comissão',
          ),
        ),
        const SizedBox(height: AppSpacing.x5),

        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Label('Sort order'),
                  TextFormField(
                    controller: sortOrderCtrl,
                    keyboardType: TextInputType.number,
                    style: AppTypography.bodyMedium,
                    decoration: const InputDecoration(hintText: '0'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.x4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Label('Destaque'),
                  Container(
                    height: 48,
                    alignment: Alignment.centerLeft,
                    child: Row(
                      children: [
                        Switch.adaptive(
                          value: destaque,
                          onChanged: onDestaqueChanged,
                          activeColor: AppColors.primary,
                        ),
                        const SizedBox(width: AppSpacing.x2),
                        Text(
                          destaque
                              ? 'Aparece em destaques'
                              : 'Sem destaque',
                          style: AppTypography.bodySmall
                              .copyWith(color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x6),

        _Label('Markdown'),
        TextFormField(
          controller: contentCtrl,
          maxLines: null,
          minLines: 20,
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: 13,
            height: 1.55,
          ),
          decoration: const InputDecoration(
            hintText: '# Título\n\nEscreva aqui usando Markdown…',
            alignLabelWithHint: true,
          ),
        ),
      ],
    );
  }
}

class _PreviewColumn extends StatefulWidget {
  final TextEditingController titulo;
  final TextEditingController excerpt;
  final TextEditingController content;
  final KbVideoProvider videoProvider;
  final TextEditingController videoUrl;

  const _PreviewColumn({
    required this.titulo,
    required this.excerpt,
    required this.content,
    required this.videoProvider,
    required this.videoUrl,
  });

  @override
  State<_PreviewColumn> createState() => _PreviewColumnState();
}

class _PreviewColumnState extends State<_PreviewColumn> {
  static const Duration _debounceWindow = Duration(milliseconds: 500);
  Timer? _debounce;

  // Snapshot debounced — preview só rebuilda quando este muda.
  late String _debouncedTitulo;
  late String _debouncedExcerpt;
  late String _debouncedContent;
  late String _debouncedVideoUrl;
  late KbVideoProvider _debouncedProvider;

  @override
  void initState() {
    super.initState();
    _debouncedTitulo = widget.titulo.text;
    _debouncedExcerpt = widget.excerpt.text;
    _debouncedContent = widget.content.text;
    _debouncedVideoUrl = widget.videoUrl.text;
    _debouncedProvider = widget.videoProvider;
    widget.titulo.addListener(_scheduleRebuild);
    widget.excerpt.addListener(_scheduleRebuild);
    widget.content.addListener(_scheduleRebuild);
    widget.videoUrl.addListener(_scheduleRebuild);
  }

  @override
  void didUpdateWidget(covariant _PreviewColumn old) {
    super.didUpdateWidget(old);
    if (old.videoProvider != widget.videoProvider) {
      // troca de provider é evento discreto — rebuild imediato
      _flushNow();
    }
  }

  void _scheduleRebuild() {
    _debounce?.cancel();
    _debounce = Timer(_debounceWindow, _flushNow);
  }

  void _flushNow() {
    if (!mounted) return;
    setState(() {
      _debouncedTitulo = widget.titulo.text;
      _debouncedExcerpt = widget.excerpt.text;
      _debouncedContent = widget.content.text;
      _debouncedVideoUrl = widget.videoUrl.text;
      _debouncedProvider = widget.videoProvider;
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    widget.titulo.removeListener(_scheduleRebuild);
    widget.excerpt.removeListener(_scheduleRebuild);
    widget.content.removeListener(_scheduleRebuild);
    widget.videoUrl.removeListener(_scheduleRebuild);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(width: 18, height: 1, color: AppColors.primary),
            const SizedBox(width: 8),
            Text(
              'PRÉ-VISUALIZAÇÃO',
              style: AppTypography.caption.copyWith(
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.4,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.x4),
        Text(
          _debouncedTitulo.trim().isEmpty ? 'Título do artigo' : _debouncedTitulo,
          style: AppTypography.h1.copyWith(color: AppColors.textPrimary),
        ),
        const SizedBox(height: AppSpacing.x4),
        // VideoBlock acima do markdown (debounce 500ms evita rebuild de iframe a cada keystroke).
        if (_debouncedProvider != KbVideoProvider.none &&
            _debouncedVideoUrl.trim().isNotEmpty)
          VideoBlock(provider: _debouncedProvider, url: _debouncedVideoUrl),
        if (_debouncedExcerpt.trim().isNotEmpty) ...[
          Text(
            _debouncedExcerpt,
            style: AppTypography.bodyLarge.copyWith(
              color: AppColors.textSecondary,
              fontSize: 18,
              height: 1.6,
            ),
          ),
          const SizedBox(height: AppSpacing.x4),
          const Divider(color: AppColors.borderLight, height: 1),
          const SizedBox(height: AppSpacing.x4),
        ],
        if (_debouncedContent.trim().isEmpty)
          Text(
            'A pré-visualização do conteúdo aparece aqui.',
            style: AppTypography.bodyMedium
                .copyWith(color: AppColors.textMuted),
          )
        else
          MarkdownRenderer(data: _debouncedContent),
      ],
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Text(
        text,
        style: AppTypography.label.copyWith(
          color: AppColors.textSecondary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
