import 'dart:convert';
import 'dart:ui' as ui;

import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/features/chat/domain/message_model.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService({
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
  AiGatewayResponse? _lastGatewayResponse;

  AiGatewayResponse? get lastGatewayResponse => _lastGatewayResponse;

  static String _normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return '';
    }
    final withoutTrailingSlash = trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
    final parsed = Uri.tryParse(withoutTrailingSlash);
    if (parsed != null &&
        kIsWeb &&
        parsed.host.trim().toLowerCase() == '10.0.2.2') {
      return parsed.replace(host: 'localhost').toString();
    }
    return withoutTrailingSlash;
  }

  static String _deviceRegionOrUnknown() {
    // Best-effort, non-invasive device hint. Country is fixed to Nepal server-side.
    final tz = DateTime.now().timeZoneName.trim();
    if (tz.isNotEmpty && tz.toLowerCase() != 'utc') {
      return tz.length > 120 ? tz.substring(0, 120) : tz;
    }

    final dispatcher = ui.PlatformDispatcher.instance;
    final locale = dispatcher.locales.isNotEmpty
        ? dispatcher.locales.first
        : dispatcher.locale;
    final countryCode = (locale.countryCode ?? '').trim().toUpperCase();
    if (countryCode.isEmpty || countryCode == 'NP') {
      return 'unknown';
    }
    return countryCode;
  }

  Future<String> sendMentalHealthMessage({
    required String userMessage,
    required AppLanguage language,
    required List<MessageModel> history,
  }) async {
    final normalizedHistory = history
        .where((m) => m.text.trim().isNotEmpty)
        .map(
          (m) => {
            'role': m.isUser ? 'user' : 'assistant',
            'content': m.text.trim(),
          },
        )
        .toList();

    if (normalizedHistory.isNotEmpty) {
      final last = normalizedHistory.last;
      if (last['role'] == 'user' && last['content'] == userMessage.trim()) {
        normalizedHistory.removeLast();
      }
    }

    if (_gatewayBaseUrl.isEmpty) {
      throw Exception(
        'AI_GATEWAY_BASE_URL is not configured. Start app with --dart-define=AI_GATEWAY_BASE_URL=https://your-admin-domain',
      );
    }

    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('User must be signed in before sending AI messages.');
    }

    final idToken = await user.getIdToken();
    if (idToken == null || idToken.isEmpty) {
      throw Exception('Could not obtain Firebase ID token.');
    }

    final response = await _httpClient.post(
      Uri.parse('$_gatewayBaseUrl/api/ai/chat'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $idToken',
      },
      body: jsonEncode(<String, dynamic>{
        'message': userMessage.trim(),
        'history': normalizedHistory,
        'language': language == AppLanguage.nepali ? 'nepali' : 'english',
        'userRegion': _deviceRegionOrUnknown(),
      }),
    );

    final body = jsonDecode(response.body);
    final data = body is Map
        ? body.cast<String, dynamic>()
        : <String, dynamic>{};

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = (data['error'] ?? 'AI gateway request failed.').toString();
      final errorCode = (data['errorCode'] ?? '').toString();
      final primaryErrorCode = (data['primaryErrorCode'] ?? '').toString();
      final requestId = (data['requestId'] ?? '').toString();
      final parts = <String>[error];
      if (errorCode.isNotEmpty) {
        parts.add('code=$errorCode');
      }
      if (primaryErrorCode.isNotEmpty) {
        parts.add('primary=$primaryErrorCode');
      }
      if (requestId.isNotEmpty) {
        parts.add('requestId=$requestId');
      }
      throw Exception(parts.join(' | '));
    }

    final reply = (data['reply'] ?? '').toString().trim();
    if (reply.isEmpty) {
      throw Exception('AI gateway returned an empty response.');
    }

    _lastGatewayResponse = AiGatewayResponse(
      reply: reply,
      providerUsed: (data['providerUsed'] ?? '').toString(),
      modelUsed: (data['modelUsed'] ?? '').toString(),
      fallbackUsed: data['fallbackUsed'] == true,
      requestId: (data['requestId'] ?? '').toString(),
      latencyMs: (data['latencyMs'] as num?)?.toInt() ?? 0,
    );

    return reply;
  }
}

class AiGatewayResponse {
  final String reply;
  final String providerUsed;
  final String modelUsed;
  final bool fallbackUsed;
  final String requestId;
  final int latencyMs;

  const AiGatewayResponse({
    required this.reply,
    required this.providerUsed,
    required this.modelUsed,
    required this.fallbackUsed,
    required this.requestId,
    required this.latencyMs,
  });
}
