import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/chat/chat_screen.dart';
import 'package:ai_chat/src/features/forum/forum_screen.dart';
import 'package:ai_chat/src/features/mood/mood_tracker_screen.dart';
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
      icon: Icons.mood_outlined,
      selectedIcon: Icons.mood_rounded,
      label: 'Mood',
    ),
    _NavItem(
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
      label: 'Chat',
    ),
    _NavItem(
      icon: Icons.assignment_outlined,
      selectedIcon: Icons.assignment_rounded,
      label: 'Tools',
    ),
    _NavItem(
      icon: Icons.medical_services_outlined,
      selectedIcon: Icons.medical_services_rounded,
      label: 'Therapist',
    ),
    _NavItem(
      icon: Icons.people_outline_rounded,
      selectedIcon: Icons.people_rounded,
      label: 'Forum',
    ),
    _NavItem(
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings_rounded,
      label: 'More',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final nickname = widget.nickname.trim().isNotEmpty
        ? widget.nickname.trim()
        : 'You';

    final pages = [
      MoodTrackerScreen(nickname: nickname),
      ChatScreen(nickname: nickname, isGuest: widget.isGuest),
      const SelfHelpScreen(),
      TherapistScreen(nickname: nickname),
      ForumScreen(nickname: nickname, currentUserId: widget.currentUserId),
      MoreScreen(nickname: nickname, isGuest: widget.isGuest),
    ];

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: AppColors.backgroundGradient,
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: IndexedStack(index: _index, children: pages),
        ),
        bottomNavigationBar: _BottomNav(
          selectedIndex: _index,
          items: _navItems,
          onTap: (i) => setState(() => _index = i),
        ),
      ),
    );
  }
}

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
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(
          top: BorderSide(color: AppColors.divider, width: 0.8),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140F172A),
            blurRadius: 14,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(8, 8, 8, 8 + bottom),
        child: Row(
          children: List.generate(items.length, (i) {
            final selected = i == selectedIndex;
            final item = items[i];

            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: InkWell(
                  onTap: () => onTap(i),
                  borderRadius: BorderRadius.circular(12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.primaryDim
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          selected ? item.selectedIcon : item.icon,
                          size: 20,
                          color: selected
                              ? AppColors.primary
                              : AppColors.textTertiary,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          item.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: selected
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: selected
                                ? AppColors.primary
                                : AppColors.textTertiary,
                            letterSpacing: 0.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

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
