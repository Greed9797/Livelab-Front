import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../design_system/app_tokens.dart' as ds_tokens;
import '../../livelab/theme/livelab_theme.dart';
import '../../routes/app_routes.dart';
import '../../widgets/app_scaffold.dart';
import 'cliente_agenda_screen.dart';
import 'cliente_lives_screen.dart';
import 'cliente_reservas_screen.dart';

class ClienteCabinesTabsScreen extends ConsumerStatefulWidget {
  const ClienteCabinesTabsScreen({super.key});

  @override
  ConsumerState<ClienteCabinesTabsScreen> createState() =>
      _ClienteCabinesTabsScreenState();
}

class _ClienteCabinesTabsScreenState
    extends ConsumerState<ClienteCabinesTabsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.llTokens;

    return AppScaffold(
      currentRoute: AppRoutes.clienteCabinesTabs,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header — eyebrow + serif italic title
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 16, 28, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 18, height: 1, color: t.primary),
                        const SizedBox(width: 8),
                        Text(
                          'CABINES',
                          style: TextStyle(
                            color: t.textMuted,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.4,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(
                          text: 'Minhas',
                          style: GoogleFonts.getFont(
                            'Instrument Serif',
                            fontSize: 32,
                            letterSpacing: -0.6,
                            fontWeight: FontWeight.w400,
                            fontStyle: FontStyle.italic,
                            color: t.textPrimary,
                          ),
                        ),
                        TextSpan(
                          text: ' Lives',
                          style: TextStyle(
                            color: t.textPrimary,
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.9,
                            height: 1.1,
                          ),
                        ),
                      ]),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Suas transmissões ao vivo',
                      style: TextStyle(color: t.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 14),
                  ],
                ),
              ),
              // TabBar
              TabBar(
                controller: _tab,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: t.primary,
                unselectedLabelColor: t.textMuted,
                indicatorColor: t.primary,
                indicatorWeight: 2,
                padding: const EdgeInsets.symmetric(
                    horizontal: ds_tokens.AppSpacing.x6),
                tabs: [
                  Tab(
                    child: Row(
                      children: [
                        Icon(PhosphorIcons.videoCamera(), size: 16),
                        const SizedBox(width: 6),
                        const Text('Lives'),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      children: [
                        Icon(PhosphorIcons.calendarBlank(), size: 16),
                        const SizedBox(width: 6),
                        const Text('Agenda'),
                      ],
                    ),
                  ),
                  Tab(
                    child: Row(
                      children: [
                        Icon(PhosphorIcons.plusCircle(), size: 16),
                        const SizedBox(width: 6),
                        const Text('Solicitar'),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 1),
              // Content
              Expanded(
                child: TabBarView(
                  controller: _tab,
                  children: const [
                    ClienteLivesBody(),
                    ClienteReservasBody(),
                    ClienteAgendaBody(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
