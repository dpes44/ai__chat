import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/chat/chat_screen.dart';
import 'package:ai_chat/src/features/emergency/emergency_contacts_screen.dart';
import 'package:ai_chat/src/features/forum/forum_screen.dart';
import 'package:ai_chat/src/features/self_help/self_help_screen.dart';
import 'package:ai_chat/src/features/therapist/therapist_screen.dart';
import 'package:ai_chat/src/features/settings/settings_screen.dart';
import 'package:ai_chat/src/features/legal/privacy_policy_screen.dart';
import 'package:ai_chat/src/features/legal/terms_screen.dart';
import 'package:ai_chat/src/services/auth_service.dart';

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
  int _selectedIndex = 0;
  final AuthService _authService = AuthService();

  Future<void> _logout() async {
    await _authService.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final nickname = widget.nickname.trim().isNotEmpty
        ? widget.nickname.trim()
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
      ForumScreen(nickname: nickname, currentUserId: widget.currentUserId),
      EmergencyContactsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Hey, $nickname',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        actions: [
          PopupMenuButton<_ProfileMenu>(
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
                child: Text(
                  'Version 1.0.0',
                  style: TextStyle(color: AppColors.textTertiary),
                ),
              ),
              PopupMenuItem(
                value: _ProfileMenu.logout,
                child: Text(widget.isGuest ? 'Logout guest session' : 'Logout'),
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
                  _logout();
                  break;
                case _ProfileMenu.version:
                  break;
              }
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: CircleAvatar(
                backgroundColor: AppColors.primarySurface,
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
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.divider, width: 0.5)),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (index) =>
              setState(() => _selectedIndex = index),
          backgroundColor: Colors.transparent,
          elevation: 0,
          indicatorColor: AppColors.primarySurface,
          height: 64,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
          destinations: destinations
              .map(
                (d) => NavigationDestination(
                  icon: Icon(d.icon, color: AppColors.textTertiary),
                  selectedIcon: Icon(d.selectedIcon, color: AppColors.primary),
                  label: d.label,
                ),
              )
              .toList(),
        ),
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
