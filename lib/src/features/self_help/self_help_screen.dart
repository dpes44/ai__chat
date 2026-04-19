import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/models/tool_item.dart';
import 'package:ai_chat/src/services/tools_repository.dart';
import 'tool_chat_screen.dart';

class SelfHelpScreen extends StatefulWidget {
  const SelfHelpScreen({super.key});

  @override
  State<SelfHelpScreen> createState() => _SelfHelpScreenState();
}

class _SelfHelpScreenState extends State<SelfHelpScreen> {
  final ToolsRepository _repository = ToolsRepository();
  late final Future<List<ToolItem>> _toolsFuture = _repository.loadTools();

  @override
  Widget build(BuildContext context) {
    final lang = context.appLanguage;
    return FutureBuilder<List<ToolItem>>(
      future: _toolsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text(
              'Could not load tools right now.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          );
        }
        final tools = snapshot.data ?? [];
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          itemCount: tools.length,
          itemBuilder: (context, index) {
            final tool = tools[index];
            final title = lang == AppLanguage.nepali
                ? tool.nameNp
                : tool.nameEn;
            final icon = _iconForIndex(index);
            return GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ToolChatScreen(tool: tool)),
                );
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.divider, width: 0.5),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (tool.summary.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              tool.summary,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: AppColors.textTertiary,
                      size: 22,
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

IconData _iconForIndex(int index) {
  const icons = [
    Icons.auto_awesome,
    Icons.spa_rounded,
    Icons.self_improvement_rounded,
    Icons.nights_stay_rounded,
    Icons.health_and_safety_rounded,
    Icons.favorite_rounded,
  ];
  return icons[index % icons.length];
}
