import 'emergency_contact.dart';
import 'therapist_subscription.dart';
import 'tool_item.dart';

class RuntimeContent {
  final List<ToolItem> tools;
  final List<EmergencyContact> emergencyContacts;
  final List<TherapistSubscription> therapistSubscriptions;
  final String termsTitle;
  final String termsBody;
  final String privacyTitle;
  final String privacyBody;

  const RuntimeContent({
    required this.tools,
    required this.emergencyContacts,
    required this.therapistSubscriptions,
    required this.termsTitle,
    required this.termsBody,
    required this.privacyTitle,
    required this.privacyBody,
  });
}
