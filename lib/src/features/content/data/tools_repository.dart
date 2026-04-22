import '../domain/tool_item.dart';
import 'runtime_content_service.dart';

class ToolsRepository {
  ToolsRepository({
    RuntimeContentService? runtimeContentService,
  }) : _runtimeContentService =
           runtimeContentService ?? RuntimeContentService();

  final RuntimeContentService _runtimeContentService;
  List<ToolItem>? _cache;

  Future<List<ToolItem>> loadTools() async {
    if (_cache != null) return _cache!;
    final content = await _runtimeContentService.loadContent();
    _cache = content?.tools ?? <ToolItem>[];
    return _cache!;
  }
}
