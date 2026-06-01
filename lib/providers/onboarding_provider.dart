import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

class OnboardingState {
  final bool isLoading;
  final String? error;
  final bool success;

  const OnboardingState({
    this.isLoading = false,
    this.error,
    this.success = false,
  });
}

class OnboardingNotifier extends Notifier<OnboardingState> {
  @override
  OnboardingState build() => const OnboardingState();

  Future<bool> submit(Map<String, dynamic> data) async {
    state = const OnboardingState(isLoading: true);
    try {
      await ApiService.post('/onboarding', data: data);
      state = const OnboardingState(success: true);
      return true;
    } catch (e) {
      state = OnboardingState(error: ApiService.extractErrorMessage(e));
      return false;
    }
  }
}

final onboardingProvider =
    NotifierProvider<OnboardingNotifier, OnboardingState>(OnboardingNotifier.new);
