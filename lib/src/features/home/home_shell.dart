import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/chat/chat_screen.dart';
import 'package:ai_chat/src/features/forum/forum_screen.dart';
import 'package:ai_chat/src/features/more/more_screen.dart';
import 'package:ai_chat/src/features/self_help/self_help_screen.dart';
import 'package:ai_chat/src/features/therapist/therapist_screen.dart';

class HomeShell extends StatefulWidget {
  final String nickname;
  final String currentUserId;
  final bool isGuest;

  const HomeShell({
    super.key,
    required this.nickname,
    required this.currentUserId,
    required this.isGuest,
  });

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _navItems = [
    _NavItem(
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
      label: 'Chat',
    ),
    _NavItem(
      icon: Icons.explore_outlined,
      selectedIcon: Icons.explore_rounded,
      label: 'Tools',
    ),
    _NavItem(
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
      label: 'Therapist',
    ),
    _NavItem(
      icon: Icons.people_outline_rounded,
      selectedIcon: Icons.people_rounded,
      label: 'Forum',
    ),
    _NavItem(
      icon: Icons.apps_outlined,
      selectedIcon: Icons.apps_rounded,
      label: 'More',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final nickname = widget.nickname.trim().isNotEmpty ? widget.nickname.trim() : 'You';

    final pages = [
      ChatScreen(
        nickname: nickname,
        isGuest: widget.isGuest,
      ),
      const SelfHelpScreen(),
      const TherapistScreen(),
      ForumScreen(
        nickname: nickname,
        currentUserId: widget.currentUserId,
      ),
      MoreScreen(
        nickname: nickname,
        isGuest: widget.isGuest,
      ),
    ];

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: _BottomNav(
          selectedIndex: _index,
          items: _navItems,
          onTap: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}

// ── Custom bottom nav ─────────────────────────────────────────────────────────

class _BottomNav extends StatelessWidget {
  final int selectedIndex;
  final List<_NavItem> items;
  final ValueChanged<int> onTap;

  const _BottomNav({
    required this.selectedIndex,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).padding.bottom;
    return Container(
      color: AppColors.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(height: 0.5, color: AppColors.divider),
          Padding(
            padding: EdgeInsets.fromLTRB(28, 10, 28, 10 + bottom),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(items.length, (i) {
                final selected = i == selectedIndex;
                final item = items[i];
                return GestureDetector(
                  onTap: () => onTap(i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeInOut,
                    padding: EdgeInsets.symmetric(
                      horizontal: selected ? 18 : 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.primaryDim : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      selected ? item.selectedIcon : item.icon,
                      size: 22,
                      color: selected ? AppColors.primary : AppColors.textTertiary,
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────

class _NavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const _NavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}
