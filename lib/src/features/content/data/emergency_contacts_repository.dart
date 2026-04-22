import 'package:flutter/material.dart';

import '../domain/emergency_contact.dart';
import 'runtime_content_service.dart';

class EmergencyContactsRepository {
  EmergencyContactsRepository({
    RuntimeContentService? runtimeContentService,
  }) : _runtimeContentService =
           runtimeContentService ?? RuntimeContentService();

  final RuntimeContentService _runtimeContentService;
  List<EmergencyContact>? _cache;

  Future<List<EmergencyContact>> loadContacts() async {
    if (_cache != null) return _cache!;
    final content = await _runtimeContentService.loadContent();
    _cache = content?.emergencyContacts ?? const <EmergencyContact>[];
    return _cache!;
  }
}

IconData iconFromName(String iconName) {
  const mapping = <String, IconData>{
    'local_police_outlined': Icons.local_police_outlined,
    'favorite_border': Icons.favorite_border,
    'volunteer_activism_outlined': Icons.volunteer_activism_outlined,
    'call_outlined': Icons.call_outlined,
    'health_and_safety_outlined': Icons.health_and_safety_outlined,
    'support_agent_outlined': Icons.support_agent_outlined,
  };
  return mapping[iconName] ?? Icons.call_outlined;
}
