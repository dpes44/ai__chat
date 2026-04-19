import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/services/auth_service.dart';

enum _AuthMode { signIn, signUp }

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final AuthService _authService = AuthService();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  _AuthMode _mode = _AuthMode.signIn;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitEmailAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _error = 'Email and password are required.';
      });
      return;
    }
    if (password.length < 6) {
      setState(() {
        _error = 'Password must be at least 6 characters.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (_mode == _AuthMode.signIn) {
        await _authService.signInWithEmail(email: email, password: password);
      } else {
        await _authService.registerWithEmail(email: email, password: password);
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        _error = _messageForAuthError(e);
      });
    } catch (_) {
      setState(() {
        _error = 'Could not authenticate right now. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _continueAsGuest() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _authService.signInAsGuest();
    } on FirebaseAuthException catch (e) {
      debugPrint('Guest sign-in failed: code=${e.code}, message=${e.message}');
      setState(() {
        _error = _messageForAuthError(e);
      });
    } catch (_) {
      setState(() {
        _error = 'Could not continue as guest right now. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _mode == _AuthMode.signIn ? 'Sign in' : 'Create account';
    final subtitle = _mode == _AuthMode.signIn
        ? 'Use your email, or continue as guest.'
        : 'Create an account, or continue as guest.';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Man Ko Sathi'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 20),
            SegmentedButton<_AuthMode>(
              showSelectedIcon: false,
              selected: {_mode},
              onSelectionChanged: (value) {
                setState(() {
                  _mode = value.first;
                  _error = null;
                });
              },
              segments: const [
                ButtonSegment(value: _AuthMode.signIn, label: Text('Sign in')),
                ButtonSegment(value: _AuthMode.signUp, label: Text('Sign up')),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              enabled: !_loading,
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'you@example.com',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: true,
              enabled: !_loading,
              decoration: const InputDecoration(
                labelText: 'Password',
                hintText: 'At least 6 characters',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitEmailAuth,
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        _mode == _AuthMode.signIn
                            ? 'Sign in with email'
                            : 'Create account',
                      ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _loading ? null : _continueAsGuest,
                child: const Text('Continue as guest'),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'You will choose a nickname in the next step.',
              style: TextStyle(color: AppColors.textTertiary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  String _messageForAuthError(FirebaseAuthException e) {
    final rawMessage = e.message ?? '';
    if (rawMessage.contains('CONFIGURATION_NOT_FOUND')) {
      return 'Firebase Authentication is not configured for this project yet.';
    }

    switch (e.code) {
      case 'invalid-email':
        return 'Invalid email format.';
      case 'configuration-not-found':
        return 'Firebase Authentication is not initialized for this web app/project.';
      case 'invalid-api-key':
        return 'Firebase Web API key is invalid for this project.';
      case 'app-not-authorized':
        return 'This app/domain is not authorized in Firebase Authentication settings.';
      case 'admin-restricted-operation':
        return 'Anonymous sign-in is disabled in Firebase Authentication.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Invalid email or password.';
      case 'email-already-in-use':
        return 'This email is already registered.';
      case 'weak-password':
        return 'Password is too weak.';
      case 'operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase.';
      case 'network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return '${e.message ?? 'Authentication failed. Please try again.'} (code: ${e.code})';
    }
  }
}
