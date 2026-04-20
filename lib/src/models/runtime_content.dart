import 'emergency_contact.dart';
import 'therapist_subscription.dart';
import 'tool_item.dart';

class RuntimeContent {
  final List<ToolItem> tools;
  final List<EmergencyContact> emergencyContacts;
  final List<TherapistSubscription> therapistSubscriptions;

  const RuntimeContent({
    required this.tools,
    required this.emergencyContacts,
    required this.therapistSubscriptions,
  });
}
