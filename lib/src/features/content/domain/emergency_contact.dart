import 'package:flutter/material.dart';

class EmergencyContact {
  final String name;
  final String number;
  final String icon;
  final Color accentColor;

  const EmergencyContact({
    required this.name,
    required this.number,
    required this.icon,
    required this.accentColor,
  });

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: (json['name'] ?? '').toString(),
      number: (json['number'] ?? '').toString(),
      icon: (json['icon'] ?? 'call_outlined').toString(),
      accentColor: _parseColor(json['accentColor']),
    );
  }

  static Color _parseColor(dynamic value) {
    if (value is int) {
      return Color(value);
    }
    if (value is String && value.isNotEmpty) {
      final sanitized = value.replaceAll('#', '');
      final hex = sanitized.length == 6 ? 'FF$sanitized' : sanitized;
      try {
        return Color(int.parse(hex, radix: 16));
      } catch (_) {
        return const Color(0xFF6AB7A8);
      }
    }
    return const Color(0xFF6AB7A8);
  }
}
