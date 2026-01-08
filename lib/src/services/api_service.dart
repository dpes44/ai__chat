import 'dart:convert';

import 'package:http/http.dart' as http;

import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/core/constants/prompts.dart';
import 'package:ai_chat/src/models/message_model.dart';

class ApiService {
  ApiService({
    http.Client? client,
    String? apiKey,
  })  : _client = client ?? http.Client(),
        _apiKey = apiKey ?? const String.fromEnvironment('OPENAI_API_KEY');

  final http.Client _client;
  final String _apiKey;

  static const String _endpoint = 'https://api.openai.com/v1/chat/completions';
  static const String _model = 'gpt-4o-mini';

  Future<String> sendMentalHealthMessage({
    required String userMessage,
    required AppLanguage language,
    required List<MessageModel> history,
  }) async {
    if (_apiKey.isEmpty) {
      throw Exception('Missing OPENAI_API_KEY. Set it as a dart-define or env var.');
    }

    final messages = <Map<String, String>>[
      {
        'role': 'system',
        'content': mentalHealthSystemPrompt,
      },
      {
        'role': 'system',
        'content': language == AppLanguage.nepali
            ? 'Respond only in Nepali.'
            : 'Respond only in English.',
      },
      ...history.map((m) => {
            'role': m.isUser ? 'user' : 'assistant',
            'content': m.text,
          }),
      {
        'role': 'user',
        'content': userMessage,
      },
    ];

    final response = await _client.post(
      Uri.parse(_endpoint),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: jsonEncode({
        'model': _model,
        'messages': messages,
        'temperature': 0.6,
        'max_tokens': 256,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('OpenAI error: ${response.statusCode} ${response.body}');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final choices = decoded['choices'] as List<dynamic>;
    if (choices.isEmpty) {
      throw Exception('OpenAI returned no choices.');
    }

    final content = choices.first['message']['content'] as String?;
    if (content == null || content.isEmpty) {
      throw Exception('OpenAI returned empty content.');
    }

    return content.trim();
  }
}
