import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/features/chat/chat_screen.dart';
import 'package:ai_chat/src/features/emergency/emergency_contacts_screen.dart';
import 'package:ai_chat/src/features/forum/forum_screen.dart';
import 'package:ai_chat/src/features/self_help/self_help_screen.dart';
import 'package:ai_chat/src/features/therapist/therapist_screen.dart';
import 'package:ai_chat/src/features/settings/settings_screen.dart';
import 'package:ai_chat/src/features/legal/privacy_policy_screen.dart';
import 'package:ai_chat/src/features/legal/terms_screen.dart';
import 'package:ai_chat/src/features/onboarding/nickname_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomeShell extends StatefulWidget {
  final String? nickname;

  const HomeShell({super.key, this.nickname});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _selectedIndex = 0;

  Future<void> _logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('nickname');
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const NicknameScreen(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final nickname = widget.nickname?.trim().isNotEmpty == true
        ? widget.nickname!.trim()
        : 'You';
    final initial = nickname.isNotEmpty
        ? nickname.characters.first.toUpperCase()
        : 'Y';

    final destinations = [
      const _Destination(
        icon: Icons.chat_bubble_outline_rounded,
        selectedIcon: Icons.chat_bubble_rounded,
        label: 'Chat',
      ),
      const _Destination(
        icon: Icons.spa_outlined,
        selectedIcon: Icons.spa_rounded,
        label: 'Self help',
      ),
      const _Destination(
        icon: Icons.favorite_border_rounded,
        selectedIcon: Icons.favorite_rounded,
        label: 'Therapist',
      ),
      const _Destination(
        icon: Icons.forum_outlined,
        selectedIcon: Icons.forum_rounded,
        label: 'Forum',
      ),
      const _Destination(
        icon: Icons.health_and_safety_outlined,
        selectedIcon: Icons.health_and_safety_rounded,
        label: 'Emergency',
      ),
    ];

    final pages = [
      const ChatScreen(),
      SelfHelpScreen(),
      TherapistScreen(),
      ForumScreen(nickname: nickname),
      EmergencyContactsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.appTitle),
        actions: [
          PopupMenuButton<_ProfileMenu>(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            position: PopupMenuPosition.under,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: _ProfileMenu.settings,
                child: const Text('Settings'),
              ),
              PopupMenuItem(
                value: _ProfileMenu.terms,
                child: const Text('Terms & Conditions'),
              ),
              PopupMenuItem(
                value: _ProfileMenu.privacy,
                child: const Text('Privacy Policy'),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: _ProfileMenu.version,
                enabled: false,
                child: const Text('Version 1.0.0'),
              ),
              PopupMenuItem(
                value: _ProfileMenu.logout,
                child: const Text('Logout'),
              ),
            ],
            onSelected: (value) {
              switch (value) {
                case _ProfileMenu.settings:
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  );
                  break;
                case _ProfileMenu.terms:
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const TermsScreen()),
                  );
                  break;
                case _ProfileMenu.privacy:
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const PrivacyPolicyScreen(),
                    ),
                  );
                  break;
                case _ProfileMenu.logout:
                  _logout(context);
                  break;
                case _ProfileMenu.version:
                  break;
              }
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: CircleAvatar(
                backgroundColor: AppColors.primary.withValues(
                  alpha: 255 * 0.12,
                ),
                foregroundColor: AppColors.primary,
                child: Text(initial),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: () => FocusScope.of(context).unfocus(),
          child: IndexedStack(index: _selectedIndex, children: pages),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textLight,
        type: BottomNavigationBarType.fixed,
        showSelectedLabels: false,
        showUnselectedLabels: false,
        items: destinations
            .map(
              (d) => BottomNavigationBarItem(
                icon: Icon(d.icon),
                activeIcon: Icon(d.selectedIcon),
                label: d.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

enum _ProfileMenu { settings, terms, privacy, logout, version }

class _Destination {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const _Destination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}
