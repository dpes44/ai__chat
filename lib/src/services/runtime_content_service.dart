import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../models/emergency_contact.dart';
import '../models/runtime_content.dart';
import '../models/therapist_subscription.dart';
import '../models/tool_item.dart';

class RuntimeContentService {
  RuntimeContentService({
    http.Client? httpClient,
    FirebaseAuth? auth,
    String? gatewayBaseUrl,
  }) : _httpClient = httpClient ?? http.Client(),
       _auth = auth ?? FirebaseAuth.instance,
       _gatewayBaseUrl = _normalizeBaseUrl(
         gatewayBaseUrl ?? const String.fromEnvironment('AI_GATEWAY_BASE_URL'),
       );

  final http.Client _httpClient;
  final FirebaseAuth _auth;
  final String _gatewayBaseUrl;

  static const List<String> _localFallbackBaseUrls = <String>[
    'http://10.0.2.2:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];

  static RuntimeContent? _cache;
  static Future<RuntimeContent?>? _inFlight;

  static String _normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return '';
    }
    return trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
  }

  Future<RuntimeContent?> loadContent() {
    if (_cache != null) {
      return Future<RuntimeContent?>.value(_cache);
    }
    if (_inFlight != null) {
      return _inFlight!;
    }

    _inFlight = _fetchContent()
        .then((content) {
          if (content != null) {
            _cache = content;
          }
          return content;
        })
        .whenComplete(() {
          _inFlight = null;
        });

    return _inFlight!;
  }

  Future<RuntimeContent?> _fetchContent() async {
    final user = _auth.currentUser;
    final idToken = user == null ? null : await user.getIdToken();
    final baseUrls = _candidateBaseUrls();

    for (final baseUrl in baseUrls) {
      http.Response? response;
      if (idToken != null && idToken.isNotEmpty) {
        response = await _requestAppContent(baseUrl: baseUrl, idToken: idToken);
      }
      if (response == null ||
          response.statusCode < 200 ||
          response.statusCode >= 300) {
        response = await _requestAppContent(baseUrl: baseUrl);
      }

      final parsed = _parseRuntimeContentFromResponse(response);
      if (parsed != null) {
        debugPrint('RuntimeContentService: loaded app content from $baseUrl');
        return parsed;
      }
    }

    debugPrint(
      'RuntimeContentService: failed to load app content. '
      'Tried base URLs: ${baseUrls.join(', ')}',
    );
    return null;
  }

  List<String> _candidateBaseUrls() {
    final candidates = <String>{};
    if (_gatewayBaseUrl.isNotEmpty) {
      candidates.add(_gatewayBaseUrl);
    } else {
      candidates.addAll(_localFallbackBaseUrls);
    }
    return candidates.toList(growable: false);
  }

  Future<http.Response?> _requestAppContent({
    required String baseUrl,
    String? idToken,
  }) async {
    try {
      return await _httpClient
          .get(
            Uri.parse('$baseUrl/api/app-content'),
            headers: {
              'Content-Type': 'application/json',
              if (idToken != null && idToken.isNotEmpty)
                'Authorization': 'Bearer $idToken',
            },
          )
          .timeout(const Duration(seconds: 5));
    } catch (error) {
      debugPrint(
        'RuntimeContentService: request failed for $baseUrl '
        '${idToken == null ? "(public)" : "(auth)"}: $error',
      );
      return null;
    }
  }

  RuntimeContent? _parseRuntimeContentFromResponse(http.Response? response) {
    if (response == null ||
        response.statusCode < 200 ||
        response.statusCode >= 300) {
      return null;
    }

    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (error) {
      debugPrint('RuntimeContentService: invalid JSON response: $error');
      return null;
    }

    if (body is! Map) {
      return null;
    }

    final bodyMap = _toStringMap(body);
    final dataMap = _toStringMap(bodyMap['data']);
    if (dataMap.isEmpty) {
      return null;
    }

    final promptContext = _toStringMap(dataMap['promptContext']);
    final tools = _toMapList(dataMap['tools'])
        .map(ToolItem.fromJson)
        .where(
          (item) => item.id.trim().isNotEmpty && item.nameEn.trim().isNotEmpty,
        )
        .toList();
    final subscriptions = _toMapList(dataMap['therapistSubscriptions'])
        .map(TherapistSubscription.fromJson)
        .where((plan) => plan.name.trim().isNotEmpty)
        .toList();

    return RuntimeContent(
      tools: tools,
      emergencyContacts: _buildEmergencyContacts(promptContext),
      therapistSubscriptions: subscriptions,
    );
  }

  Map<String, dynamic> _toStringMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      final result = <String, dynamic>{};
      value.forEach((key, val) {
        result[key.toString()] = val;
      });
      return result;
    }
    return const <String, dynamic>{};
  }

  List<Map<String, dynamic>> _toMapList(dynamic value) {
    if (value is! List) {
      return const [];
    }

    final list = <Map<String, dynamic>>[];
    for (final item in value) {
      final map = _toStringMap(item);
      if (map.isNotEmpty) {
        list.add(map);
      }
    }
    return list;
  }

  List<EmergencyContact> _buildEmergencyContacts(
    Map<String, dynamic> promptContext,
  ) {
    final contacts = <EmergencyContact>[];
    final seen = <String>{};

    bool isConfigured(String value) {
      final normalized = value.trim().toLowerCase();
      return normalized.isNotEmpty &&
          normalized != 'none' &&
          normalized != 'not configured' &&
          normalized != 'n/a' &&
          normalized != 'na' &&
          normalized != 'null';
    }

    void addContact({
      required String name,
      required String number,
      required String icon,
      required String accentColor,
    }) {
      final cleanName = name.trim();
      final cleanNumber = number.trim();
      if (!isConfigured(cleanName) || !isConfigured(cleanNumber)) {
        return;
      }

      final normalizedNumber = cleanNumber.replaceAll(RegExp(r'\s+'), '');
      final key = '${cleanName.toLowerCase()}|${normalizedNumber.toLowerCase()}';
      if (!seen.add(key)) {
        return;
      }

      contacts.add(
        EmergencyContact.fromJson({
          'name': cleanName,
          'number': cleanNumber,
          'icon': icon,
          'accentColor': accentColor,
        }),
      );
    }

    addContact(
      name: 'Police emergency',
      number: (promptContext['policeEmergency'] ?? '').toString(),
      icon: 'local_police_outlined',
      accentColor: '#FA8072',
    );
    addContact(
      name: 'Suicide helpline',
      number: (promptContext['suicideHelpline'] ?? '').toString(),
      icon: 'favorite_border',
      accentColor: '#FFC857',
    );
    addContact(
      name: 'Ambulance',
      number: (promptContext['ambulanceNumber'] ?? '').toString(),
      icon: 'volunteer_activism_outlined',
      accentColor: '#6CC5A1',
    );
    addContact(
      name: 'Child helpline',
      number: (promptContext['childHelpline'] ?? '').toString(),
      icon: 'support_agent_outlined',
      accentColor: '#64B5F6',
    );
    addContact(
      name: 'Women/GBV helpline',
      number: (promptContext['womenGbvHelpline'] ?? '').toString(),
      icon: 'call_outlined',
      accentColor: '#E57399',
    );
    addContact(
      name: 'Psychosocial helpline',
      number: (promptContext['psychosocialHelpline'] ?? '').toString(),
      icon: 'health_and_safety_outlined',
      accentColor: '#9CCC65',
    );

    return contacts;
  }
}
