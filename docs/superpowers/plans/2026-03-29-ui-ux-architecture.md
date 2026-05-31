# LiveShop UI/UX Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar a interface do LiveShop SaaS para um padrão premium B2B, implementando responsividade com LayoutBuilder (Tablet/Web/Mobile), alta performance com Slivers (60/120fps), Theming M3 com GoogleFonts, e micro-interações nativas.

**Architecture:** A UI será reestruturada para garantir zero lentidão na *Home Screen*. Dependências pesadas como mapas serão carregadas apenas em suas respectivas rotas sob demanda (`/carteira-clientes`). A tela principal será baseada em `CustomScrollView`, com loading de skeletons (`shimmer`) para transições suaves, além de micro-animações nativas (`TweenAnimationBuilder`, `AnimationController`).

**Tech Stack:** Flutter, Material 3, `google_fonts`, `flutter_svg`, `shimmer`, Riverpod.

---

### Task 1: Setup de Dependências e ThemeData (Material 3)

**Files:**
- Modify: `pubspec.yaml`
- Modify: `lib/theme/app_theme.dart`

- [ ] **Step 1: Update pubspec.yaml**
Adicionar `google_fonts`, `flutter_svg` e `shimmer`.
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_map: ^6.1.0
  latlong2: ^0.9.0
  flutter_riverpod: ^2.5.1
  dio: ^5.4.3
  flutter_secure_storage: ^9.2.2
  url_launcher: ^6.3.0
  google_fonts: ^6.2.1
  flutter_svg: ^2.0.10
  shimmer: ^3.0.0
```

- [ ] **Step 2: Run flutter pub get**
```bash
flutter pub get
```

- [ ] **Step 3: Update AppTheme para Material 3 e Deep Indigo**
```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const Color primary = Color(0xFF5B21B6); // Deep Indigo
  static const Color success = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  static const Color lilac = Color(0xFF8B5CF6);
  static const Color background = Color(0xFFF8FAFC);
}

final ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    background: AppColors.background,
  ),
  scaffoldBackgroundColor: AppColors.background,
  textTheme: GoogleFonts.interTextTheme(),
  cardTheme: CardTheme(
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    ),
    color: Colors.white,
    shadowColor: Colors.black.withValues(alpha: 0.05),
  ),
  dialogTheme: DialogTheme(
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    ),
  ),
);
```

- [ ] **Step 4: Commit**
```bash
git add pubspec.yaml lib/theme/app_theme.dart
git commit -m "feat: setup material 3 theming and add ui dependencies"
```

### Task 2: Scaffold Responsivo (LayoutBuilder + NavigationRail)

**Files:**
- Modify: `lib/widgets/app_scaffold.dart`
- Modify: `lib/routes/app_routes.dart`

- [ ] **Step 1: Adicionar nova rota do mapa em app_routes.dart**
```dart
class AppRoutes {
  // ... outras rotas
  static const String carteiraClientes = '/carteira-clientes';
}
```

- [ ] **Step 2: Update AppScaffold com LayoutBuilder**
```dart
import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../theme/app_theme.dart';

class AppScaffold extends StatelessWidget {
  final Widget child;
  final String currentRoute;

  const AppScaffold({super.key, required this.child, required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 800;

        if (isDesktop) {
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: _getSelectedIndex(currentRoute),
                  onDestinationSelected: (idx) => _navigateToIndex(context, idx),
                  labelType: NavigationRailLabelType.all,
                  selectedIconTheme: const IconThemeData(color: AppColors.primary),
                  selectedLabelTextStyle: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: Text('Home')),
                    NavigationRailDestination(icon: Icon(Icons.videocam_outlined), selectedIcon: Icon(Icons.videocam), label: Text('Cabines')),
                    NavigationRailDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: Text('Carteira')),
                  ],
                ),
                const VerticalDivider(thickness: 1, width: 1),
                Expanded(child: child),
              ],
            ),
          );
        }

        // Mobile
        return Scaffold(
          body: child,
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _getSelectedIndex(currentRoute),
            onTap: (idx) => _navigateToIndex(context, idx),
            selectedItemColor: AppColors.primary,
            unselectedItemColor: Colors.grey,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.videocam_outlined), label: 'Cabines'),
              BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'Carteira'),
            ],
          ),
        );
      },
    );
  }

  int _getSelectedIndex(String route) {
    if (route == AppRoutes.home) return 0;
    if (route.startsWith(AppRoutes.cabines)) return 1;
    if (route == AppRoutes.carteiraClientes) return 2;
    return 0;
  }

  void _navigateToIndex(BuildContext context, int index) {
    String route = AppRoutes.home;
    if (index == 1) route = AppRoutes.cabines;
    if (index == 2) route = AppRoutes.carteiraClientes;
    if (currentRoute != route) {
      Navigator.pushReplacementNamed(context, route);
    }
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add lib/widgets/app_scaffold.dart lib/routes/app_routes.dart
git commit -m "feat: implement responsive app scaffold with navigation rail"
```

### Task 3: Refatorar MoneyCard (Gradients e Animação Vanilla)

**Files:**
- Modify: `lib/widgets/money_card.dart`

- [ ] **Step 1: Implementar MoneyCard com TweenAnimationBuilder**
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MoneyCard extends StatelessWidget {
  final double total;
  final double bruto;
  final double liquido;
  final VoidCallback? onTap;

  const MoneyCard({
    super.key,
    required this.total,
    required this.bruto,
    required this.liquido,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primary.withValues(alpha: 0.8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4)),
          ],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('FATURAMENTO DO MÊS', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _AnimatedMoneyText(value: total, style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('FAT BRUTO', style: TextStyle(color: Colors.white70, fontSize: 10)),
                    _AnimatedMoneyText(value: bruto, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('FAT LÍQUIDO', style: TextStyle(color: Colors.white70, fontSize: 10)),
                    _AnimatedMoneyText(value: liquido, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500)),
                  ],
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _AnimatedMoneyText extends StatelessWidget {
  final double value;
  final TextStyle style;

  const _AnimatedMoneyText({required this.value, required this.style});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: value),
      duration: const Duration(seconds: 1),
      curve: Curves.easeOutCubic,
      builder: (context, val, child) {
        return Text('R\$ ${val.toStringAsFixed(2).replaceAll('.', ',')}', style: style);
      },
    );
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/widgets/money_card.dart
git commit -m "feat: animate money card with native TweenAnimationBuilder and gradients"
```

### Task 4: Refatorar CabineCard (Micro-interação de Gravação)

**Files:**
- Modify: `lib/widgets/cabine_card.dart`

- [ ] **Step 1: Criar a micro-interação de Live Badge**
```dart
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'status_badge.dart';

class CabineCard extends StatefulWidget {
  final Map<String, dynamic> cabine;
  final VoidCallback? onTap;
  const CabineCard({super.key, required this.cabine, this.onTap});

  @override
  State<CabineCard> createState() => _CabineCardState();
}

class _CabineCardState extends State<CabineCard> with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  bool get isLive => widget.cabine['status'] == 'ao_vivo';

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLive ? AppColors.success.withValues(alpha: 0.5) : Colors.grey.shade200,
            width: isLive ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Cabine ${widget.cabine['numero']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                if (isLive)
                  FadeTransition(
                    opacity: _pulse,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            StatusBadge(status: widget.cabine['status'] as String),
            if (isLive) ...[
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.visibility, size: 14, color: Colors.blue),
                  const SizedBox(width: 4),
                  Text('${widget.cabine['viewer_count'] ?? 0}', style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                ],
              ),
              Text('R\$ ${(widget.cabine['gmv_atual'] ?? 0).toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success)),
            ],
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/widgets/cabine_card.dart
git commit -m "feat: refactor cabine card to include pulsating recording dot animation"
```

### Task 5: Empty States e Rota de Carteira (Mapa)

**Files:**
- Create: `lib/widgets/empty_state_widget.dart`
- Create: `lib/screens/painel_cliente/carteira_clientes_screen.dart`
- Modify: `lib/main.dart`

- [ ] **Step 1: Criar EmptyStateWidget**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class EmptyStateWidget extends StatelessWidget {
  final String message;
  const EmptyStateWidget({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Placeholder for SVG icon (using an icon if SVG asset is missing)
          const Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Criar Rota Carteira Clientes Screen**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../widgets/app_scaffold.dart';
import '../../routes/app_routes.dart';

class CarteiraClientesScreen extends StatelessWidget {
  const CarteiraClientesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentRoute: AppRoutes.carteiraClientes,
      child: Stack(
        children: [
          FlutterMap(
            options: const MapOptions(
              initialCenter: LatLng(-23.5505, -46.6333),
              initialZoom: 12,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.liveshop',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: const LatLng(-23.5505, -46.6333),
                    width: 40,
                    height: 40,
                    child: const Icon(Icons.location_on, color: Colors.green, size: 40),
                  ),
                ],
              ),
            ],
          ),
          const Positioned(
            top: 20, left: 20,
            child: Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Carteira de Clientes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ),
            ),
          )
        ],
      ),
    );
  }
}
```

- [ ] **Step 3: Adicionar a Rota no main.dart**
Adicionar a nova rota ao mapa de rotas (`routes`). (Assume-se que você adicionará a chave ao AppRoutes no Step 2).

- [ ] **Step 4: Commit**
```bash
git add lib/widgets/empty_state_widget.dart lib/screens/painel_cliente/carteira_clientes_screen.dart lib/main.dart
git commit -m "feat: create empty state widget and map route for clients portfolio"
```

### Task 6: Refatorar Home para Slivers e Shimmer Loader

**Files:**
- Modify: `lib/screens/home/home_screen.dart`

- [ ] **Step 1: Transformar Home Content em Slivers com Shimmer fallback**
```dart
// Exemplo focado na adoção do Shimmer e Slivers (CustomScrollView)
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
// ... rest of imports

// No build da HomeScreen:
// loading: () => const _HomeShimmerLoader(),

// ... Novo Widget de Shimmer:
class _HomeShimmerLoader extends StatelessWidget {
  const _HomeShimmerLoader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Shimmer.fromColors(
        baseColor: Colors.grey.shade300,
        highlightColor: Colors.grey.shade100,
        child: Column(
          children: [
            Expanded(
              flex: 5,
              child: Row(
                children: [
                  Expanded(flex: 4, child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)))),
                  const SizedBox(width: 16),
                  Expanded(flex: 6, child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)))),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(height: 60, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
            const SizedBox(height: 16),
            Expanded(flex: 4, child: Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)))),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/screens/home/home_screen.dart
git commit -m "feat: add shimmer loader to home screen for fluid loading UX"
```
