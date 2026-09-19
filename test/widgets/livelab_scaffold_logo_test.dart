import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:liveshop_saas/livelab/theme/livelab_theme.dart';
import 'package:liveshop_saas/livelab/widgets/livelab_scaffold.dart';
import '../screens/test_helpers.dart';

void main() {
  testWidgets('LivelabScaffold collapsed brand uses logo.png not favicon',
      (tester) async {
    setDesktopViewport(tester);
    await tester.pumpWidget(
      ProviderScope(
        overrides: scaffoldOverrides(papel: 'franqueador_master'),
        child: MaterialApp(
          theme: LivelabTheme.dark(),
          home: const LivelabScaffold(
            currentRoute: '/conhecimento',
            child: SizedBox.expand(),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final assetPaths = <String>[];
    for (final img in tester.widgetList<Image>(find.byType(Image))) {
      final provider = img.image;
      if (provider is AssetImage) {
        assetPaths.add(provider.assetName);
      } else if (provider is ExactAssetImage) {
        assetPaths.add(provider.assetName);
      }
    }

    expect(assetPaths, contains('assets/images/logo.png'));
    expect(assetPaths, isNot(contains('assets/images/favicon.png')));
  });
}
