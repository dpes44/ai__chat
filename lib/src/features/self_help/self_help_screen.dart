import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
  final ToolsRepository _repo = ToolsRepository();
  late final Future<List<ToolItem>> _future = _repo.loadTools();

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final lang = context.appLanguage;

    return FutureBuilder<List<ToolItem>>(
      future: _future,
      builder: (context, snapshot) {
        final tools = snapshot.data ?? const <ToolItem>[];
        final loading = snapshot.connectionState == ConnectionState.waiting;

        return CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.surface,
                padding: EdgeInsets.fromLTRB(20, top + 14, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Assessment Tools',
                      style: GoogleFonts.inter(
                        fontSize: 25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Take evidence-based check-ins to understand your mental health better.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Container(height: 0.5, color: AppColors.divider),
            ),
            if (loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (snapshot.hasError)
              SliverFillRemaining(
                child: Center(
                  child: Text(
                    'Could not load tools.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF5FF),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: const Color(0xFFCFE0FF),
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.psychology_rounded,
                            color: AppColors.primary,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'These assessments are screening tools, not diagnoses. Consider speaking to a professional for personalized guidance.',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: const Color(0xFF1E3A8A),
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    ...List.generate(tools.length, (index) {
                      final tool = tools[index];
                      final title = lang == AppLanguage.nepali
                          ? tool.nameNp
                          : tool.nameEn;
                      return _ToolListCard(
                        title: title,
                        summary: tool.summary,
                        icon: _iconForIndex(index),
                        color: _colorForIndex(index),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ToolChatScreen(tool: tool),
                          ),
                        ),
                      );
                    }),
                  ]),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _ToolListCard extends StatelessWidget {
  final String title;
  final String summary;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ToolListCard({
    required this.title,
    required this.summary,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F0F172A),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.2,
                        ),
                      ),
                      if (summary.trim().isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          summary,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: AppColors.textTertiary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Color _colorForIndex(int index) {
  const colors = [
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
    Color(0xFFF97316),
    Color(0xFF0EA5E9),
    Color(0xFFEC4899),
    Color(0xFF10B981),
  ];
  return colors[index % colors.length];
}

IconData _iconForIndex(int index) {
  const icons = [
    Icons.cloudy_snowing,
    Icons.warning_amber_rounded,
    Icons.bolt_rounded,
    Icons.nightlight_round,
    Icons.favorite_rounded,
    Icons.monitor_heart_rounded,
  ];
  return icons[index % icons.length];
}
