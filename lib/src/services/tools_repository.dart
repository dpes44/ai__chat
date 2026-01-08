import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/tool_item.dart';

class ToolsRepository {
  ToolsRepository({this.assetPath = 'assets/data/tools.json'});

  final String assetPath;
  List<ToolItem>? _cache;

  Future<List<ToolItem>> loadTools() async {
    if (_cache != null) return _cache!;
    final raw = await rootBundle.loadString(assetPath);
    final List<dynamic> jsonList = jsonDecode(raw) as List<dynamic>;
    _cache = jsonList
        .map((item) => ToolItem.fromJson(item as Map<String, dynamic>))
        .toList();
    return _cache!;
  }
}
