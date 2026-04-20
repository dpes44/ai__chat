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
        final tools = snapshot.data ?? [];
        final loading = snapshot.connectionState == ConnectionState.waiting;

        return CustomScrollView(
          slivers: [
            // ── Header ──────────────────────────────────────────────────
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.surface,
                padding: EdgeInsets.fromLTRB(20, top + 14, 20, 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tools',
                      style: GoogleFonts.inter(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Your mental health toolkit',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textTertiary,
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
            else ...[
              // ── 2-column grid ────────────────────────────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.0,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final tool = tools[index];
                      final title = lang == AppLanguage.nepali
                          ? tool.nameNp
                          : tool.nameEn;
                      return _ToolGridCard(
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
                    },
                    childCount: tools.length,
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _ToolGridCard extends StatelessWidget {
  final String title;
  final String summary;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ToolGridCard({
    required this.title,
    required this.summary,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderFaint, width: 0.8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const Spacer(),
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                height: 1.35,
                letterSpacing: -0.1,
              ),
            ),
            if (summary.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                summary,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Each tool gets a distinct accent color — not the same purple for everything
Color _colorForIndex(int index) {
  const colors = [
    Color(0xFF7C6BFF), // violet
    Color(0xFF4ECDC4), // teal
    Color(0xFFFF8C69), // coral
    Color(0xFF64B5F6), // sky blue
    Color(0xFFFFD166), // yellow
    Color(0xFFB8AEFF), // lavender
  ];
  return colors[index % colors.length];
}

IconData _iconForIndex(int index) {
  const icons = [
    Icons.auto_awesome,
    Icons.spa_rounded,
    Icons.self_improvement_rounded,
    Icons.nights_stay_rounded,
    Icons.favorite_outline_rounded,
    Icons.psychology_outlined,
  ];
  return icons[index % icons.length];
}
