import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter/material.dart';

import '../models/emergency_contact.dart';

class EmergencyContactsRepository {
  EmergencyContactsRepository({
    this.assetPath = 'assets/data/emergency_contacts.json',
  });

  final String assetPath;
  List<EmergencyContact>? _cache;

  Future<List<EmergencyContact>> loadContacts() async {
    if (_cache != null) return _cache!;

    final raw = await rootBundle.loadString(assetPath);
    final List<dynamic> jsonList = jsonDecode(raw) as List<dynamic>;
    _cache = jsonList
        .map((item) => EmergencyContact.fromJson(item as Map<String, dynamic>))
        .toList();
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
