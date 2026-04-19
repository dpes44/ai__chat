import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:ai_chat/src/features/auth/auth_screen.dart';
import 'package:ai_chat/src/features/home/home_shell.dart';
import 'package:ai_chat/src/features/onboarding/nickname_screen.dart';
import 'package:ai_chat/src/models/user_profile.dart';
import 'package:ai_chat/src/services/auth_service.dart';
import 'package:ai_chat/src/services/user_profile_repository.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final AuthService _authService = AuthService();
  final UserProfileRepository _profileRepository = UserProfileRepository();
  int _profileVersion = 0;

  void _refreshProfile() {
    setState(() => _profileVersion++);
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: _authService.authStateChanges(),
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return const _AuthLoadingScreen();
        }

        final user = authSnapshot.data;
        if (user == null) {
          return const AuthScreen();
        }

        return FutureBuilder<UserProfile?>(
          key: ValueKey('${user.uid}:$_profileVersion'),
          future: _profileRepository.fetchProfile(user.uid),
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState == ConnectionState.waiting) {
              return const _AuthLoadingScreen();
            }

            if (profileSnapshot.hasError) {
              return _AuthErrorScreen(onRetry: _refreshProfile);
            }

            final profile = profileSnapshot.data;
            final nickname = profile?.nickname.trim() ?? '';

            if (nickname.isEmpty) {
              return NicknameScreen(onSaved: (_) => _refreshProfile());
            }

            return HomeShell(
              nickname: nickname,
              currentUserId: user.uid,
              isGuest: user.isAnonymous,
            );
          },
        );
      },
    );
  }
}

class _AuthLoadingScreen extends StatelessWidget {
  const _AuthLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: Center(child: CircularProgressIndicator())),
    );
  }
}

class _AuthErrorScreen extends StatelessWidget {
  const _AuthErrorScreen({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Could not load your account right now.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
