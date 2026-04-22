import '../domain/therapist_subscription.dart';
import 'runtime_content_service.dart';

class TherapistSubscriptionsRepository {
  TherapistSubscriptionsRepository({
    RuntimeContentService? runtimeContentService,
  }) : _runtimeContentService =
           runtimeContentService ?? RuntimeContentService();

  final RuntimeContentService _runtimeContentService;
  List<TherapistSubscription>? _cache;

  Future<List<TherapistSubscription>> loadPlans() async {
    if (_cache != null) {
      return _cache!;
    }

    final content = await _runtimeContentService.loadContent();
    _cache = content?.therapistSubscriptions ?? const <TherapistSubscription>[];
    return _cache!;
  }
}
