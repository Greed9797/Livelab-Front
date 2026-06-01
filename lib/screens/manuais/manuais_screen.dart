import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';
import '../../providers/manuais_provider.dart';
import '../../routes/app_routes.dart';
import '../../design_system/design_system.dart';
import '../../services/api_service.dart';

/// Lista de conteúdos da base de conhecimento.
class ManuaisScreen extends ConsumerStatefulWidget {
  const ManuaisScreen({super.key});

  @override
  ConsumerState<ManuaisScreen> createState() => _ManuaisScreenState();
}

class _ManuaisScreenState extends ConsumerState<ManuaisScreen> {
  static const _categories = [
    'Todos',
    'Operação',
    'Comercial',
    'Equipe',
    'Legal',
    'Marca'
  ];
  String _categoria = 'Todos';
  String _busca = '';

  Future<void> _abrirAddDialog(BuildContext context) async {
    final tituloCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final paginasCtrl = TextEditingController();
    String? categoria = 'Operação';
    var destaque = false;

    await showDialog<void>(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.xl)),
            title: const Text('Novo manual'),
            content: SizedBox(
              width: 420,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppTextField(
                      controller: tituloCtrl, hint: 'Título do material *'),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                      controller: urlCtrl,
                      hint: 'URL (https://...) *',
                      keyboardType: TextInputType.url),
                  const SizedBox(height: AppSpacing.x3),
                  DropdownButtonFormField<String>(
                    initialValue: categoria,
                    decoration: const InputDecoration(labelText: 'Categoria'),
                    items: const [
                      DropdownMenuItem(value: 'Operação', child: Text('Operação')),
                      DropdownMenuItem(value: 'Comercial', child: Text('Comercial')),
                      DropdownMenuItem(value: 'Equipe', child: Text('Equipe')),
                      DropdownMenuItem(value: 'Legal', child: Text('Legal')),
                      DropdownMenuItem(value: 'Marca', child: Text('Marca')),
                    ],
                    onChanged: (v) => setDialogState(() => categoria = v),
                  ),
                  const SizedBox(height: AppSpacing.x3),
                  AppTextField(
                      controller: paginasCtrl,
                      hint: 'Páginas (opcional)',
                      keyboardType: TextInputType.number),
                  const SizedBox(height: AppSpacing.x3),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Destacar como essencial'),
                    value: destaque,
                    onChanged: (v) => setDialogState(() => destaque = v),
                  ),
                ],
              ),
            ),
            actions: [
              AppSecondaryButton(
                  label: 'Cancelar',
                  onPressed: () => Navigator.pop(dialogCtx)),
              AppPrimaryButton(
                label: 'Salvar',
                onPressed: () async {
                  final titulo = tituloCtrl.text.trim();
                  final url = urlCtrl.text.trim();
                  if (titulo.isEmpty || url.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Título e URL obrigatórios')),
                    );
                    return;
                  }
                  try {
                    await ref.read(manuaisProvider.notifier).criar({
                      'titulo': titulo,
                      'url': url,
                      if (categoria != null) 'categoria': categoria,
                      if (paginasCtrl.text.trim().isNotEmpty)
                        'paginas': int.tryParse(paginasCtrl.text.trim()),
                      'destaque': destaque,
                    });
                    if (!context.mounted) return;
                    Navigator.pop(dialogCtx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Manual adicionado')),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(ApiService.extractErrorMessage(e))),
                    );
                  }
                },
              ),
            ],
          );
        });
      },
    );
  }

  Future<void> _launchManual(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https') return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  List<Manual> _filter(List<Manual> manuais) {
    final q = _busca.trim().toLowerCase();
    return manuais.where((m) {
      final matchesCat = _categoria == 'Todos' ||
          (m.categoria != null &&
              m.categoria!.toLowerCase() == _categoria.toLowerCase());
      final matchesBusca = q.isEmpty || m.titulo.toLowerCase().contains(q);
      return matchesCat && matchesBusca;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final manuaisAsync = ref.watch(manuaisProvider);

    return AppScreenScaffold(
      currentRoute: AppRoutes.baseConhecimento,
      eyebrow: 'Biblioteca operacional',
      titleSerif: true,
      title: 'Base de Conhecimento',
      subtitle: 'Acesse materiais, processos e documentos da operação.',
      actions: [
        if (ref.watch(authProvider).user?.papel == 'franqueador_master')
          AppPrimaryButton(
            label: 'Adicionar',
            icon: Icons.add_rounded,
            onPressed: () => _abrirAddDialog(context),
          ),
        IconButton(
          icon: const Icon(Icons.refresh),
          color: context.colors.textSecondary,
          onPressed: () => ref.read(manuaisProvider.notifier).refresh(),
        ),
      ],
      child: RefreshIndicator(
        onRefresh: () => ref.read(manuaisProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.x6),
          children: [
            _SearchField(
              onChanged: (v) => setState(() => _busca = v),
            ),
            const SizedBox(height: AppSpacing.x4),
            SizedBox(
              height: 36,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(width: AppSpacing.x2),
                itemBuilder: (_, i) => AppChip(
                  label: _categories[i],
                  active: _categories[i] == _categoria,
                  onTap: () => setState(() => _categoria = _categories[i]),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.x6),
            manuaisAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.x8),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => _buildErrorCard(e),
              data: (manuais) {
                final filtrados = _filter(manuais);
                if (filtrados.isEmpty) return _buildEmptyCard();

                final destaques = _categoria == 'Todos' && _busca.isEmpty
                    ? filtrados
                        .where((m) => m.destaque || filtrados.indexOf(m) < 2)
                        .take(2)
                        .toList()
                    : const <Manual>[];
                final demais =
                    filtrados.where((m) => !destaques.contains(m)).toList();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (destaques.isNotEmpty) ...[
                      const AppSectionHeader(title: '⭐ Essenciais'),
                      LayoutBuilder(
                        builder: (ctx, c) {
                          final twoCols = c.maxWidth >= 640;
                          if (!twoCols) {
                            return Column(
                              children: destaques
                                  .map((m) => Padding(
                                        padding: const EdgeInsets.only(
                                            bottom: AppSpacing.x3),
                                        child: _FeaturedManualCard(
                                          manual: m,
                                          onOpen: () => _launchManual(m.url),
                                          onDownload: () =>
                                              _launchManual(m.url),
                                        ),
                                      ))
                                  .toList(),
                            );
                          }
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (var i = 0; i < destaques.length; i++) ...[
                                if (i > 0) const SizedBox(width: AppSpacing.x3),
                                Expanded(
                                  child: _FeaturedManualCard(
                                    manual: destaques[i],
                                    onOpen: () =>
                                        _launchManual(destaques[i].url),
                                    onDownload: () =>
                                        _launchManual(destaques[i].url),
                                  ),
                                ),
                              ],
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.x6),
                    ],
                    if (demais.isNotEmpty) ...[
                      const AppSectionHeader(title: 'Todos os documentos'),
                      ...demais.map((m) => Padding(
                            padding:
                                const EdgeInsets.only(bottom: AppSpacing.x3),
                            child: _ManualListCard(
                              manual: m,
                              onOpen: () => _launchManual(m.url),
                              onDownload: () => _launchManual(m.url),
                            ),
                          )),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(Object e) => AppCard(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              ApiService.extractErrorMessage(e),
              style: AppTypography.caption
                  .copyWith(color: context.colors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.x3),
            AppPrimaryButton(
              onPressed: () => ref.read(manuaisProvider.notifier).refresh(),
              label: 'Tentar novamente',
            ),
          ],
        ),
      );

  Widget _buildEmptyCard() => AppCard(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.x4),
            child: Text(
              'Nenhum documento corresponde aos filtros atuais.',
              style: AppTypography.bodySmall
                  .copyWith(color: context.colors.textSecondary),
            ),
          ),
        ),
      );
}

class _SearchField extends StatefulWidget {
  final ValueChanged<String> onChanged;
  const _SearchField({required this.onChanged});

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      onChanged: (v) {
        widget.onChanged(v);
        setState(() {});
      },
      decoration: InputDecoration(
        hintText: 'Buscar conteúdo...',
        prefixIcon: const Icon(Icons.search, size: 18),
        suffixIcon: _ctrl.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear, size: 16),
                onPressed: () {
                  _ctrl.clear();
                  widget.onChanged('');
                  setState(() {});
                },
              )
            : null,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x4,
          vertical: AppSpacing.x3,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: context.colors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: BorderSide(color: context.colors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
        filled: true,
        fillColor: context.colors.bgCard,
      ),
    );
  }
}

// ─── Featured Manual Card ────────────────────────────────────────────────────

class _FeaturedManualCard extends StatelessWidget {
  final Manual manual;
  final VoidCallback onOpen;
  final VoidCallback onDownload;

  const _FeaturedManualCard({
    required this.manual,
    required this.onOpen,
    required this.onDownload,
  });

  static final _dateFmt = DateFormat('dd/MM/yyyy');

  String _formatUpdated(DateTime? d) =>
      d == null ? 'Sem data' : 'Atualizado em ${_dateFmt.format(d)}';

  @override
  Widget build(BuildContext context) {
    final cat = manual.categoria ?? 'Geral';
    final pages = manual.paginas;
    final pagesText = pages != null && pages > 0 ? '$pages páginas' : 'PDF';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [context.colors.primarySoftBg, context.colors.bgCard],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        border: Border.all(color: context.colors.primarySoftFg.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      padding: const EdgeInsets.all(AppSpacing.x5),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(AppRadius.md),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x73FF5A1F),
                  blurRadius: 16,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: const Icon(Icons.description_outlined,
                color: Colors.white, size: 24),
          ),
          const SizedBox(height: AppSpacing.x4),
          Text(
            manual.titulo,
            style: AppTypography.h3,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.x1),
          Text(
            '$pagesText · $cat',
            style: AppTypography.caption.copyWith(color: context.colors.textMuted),
          ),
          Text(
            _formatUpdated(manual.atualizadoEm),
            style: AppTypography.caption.copyWith(color: context.colors.textMuted),
          ),
          const SizedBox(height: AppSpacing.x4),
          Row(
            children: [
              Expanded(
                child: AppPrimaryButton(label: 'Abrir', onPressed: onOpen),
              ),
              const SizedBox(width: AppSpacing.x2),
              AppGhostButton(
                label: 'PDF',
                icon: Icons.download,
                onPressed: onDownload,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Manual list card ─────────────────────────────────────────────────────────

class _ManualListCard extends StatelessWidget {
  final Manual manual;
  final VoidCallback onOpen;
  final VoidCallback onDownload;

  const _ManualListCard({
    required this.manual,
    required this.onOpen,
    required this.onDownload,
  });

  static final _dateFmt = DateFormat('dd/MM/yyyy');

  @override
  Widget build(BuildContext context) {
    final cat = manual.categoria;
    final pages = manual.paginas;
    final updated = manual.atualizadoEm;

    final meta = <String>[
      if (cat != null && cat.isNotEmpty) cat,
      if (pages != null && pages > 0) '$pages p.',
      if (updated != null) 'Atualizado ${_dateFmt.format(updated)}',
    ].join(' · ');

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.x3),
      onTap: onOpen,
      child: Row(
        children: [
          Container(
            width: 42,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.dangerBg,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Text(
              'PDF',
              style: AppTypography.caption.copyWith(
                color: AppColors.danger,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.x3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  manual.titulo,
                  style: AppTypography.bodyMedium
                      .copyWith(fontWeight: FontWeight.w600),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (meta.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    meta,
                    style: AppTypography.caption
                        .copyWith(color: context.colors.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          AppGhostButton(
            label: 'Ver',
            icon: Icons.open_in_new,
            onPressed: onOpen,
          ),
          IconButton(
            icon: const Icon(Icons.download, size: 18),
            color: context.colors.textSecondary,
            onPressed: onDownload,
            tooltip: 'Baixar PDF',
          ),
        ],
      ),
    );
  }
}
