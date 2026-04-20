import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
  bool _obscurePassword = true;
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
      setState(() => _error = 'Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      if (_mode == _AuthMode.signIn) {
        await _authService.signInWithEmail(email: email, password: password);
      } else {
        await _authService.registerWithEmail(email: email, password: password);
      }
    } on FirebaseAuthException catch (e) {
      setState(() => _error = _messageForAuthError(e));
    } catch (_) {
      setState(() => _error = 'Could not authenticate right now. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _continueAsGuest() async {
    setState(() { _loading = true; _error = null; });
    try {
      await _authService.signInAsGuest();
    } on FirebaseAuthException catch (e) {
      debugPrint('Guest sign-in failed: code=${e.code}, message=${e.message}');
      setState(() => _error = _messageForAuthError(e));
    } catch (_) {
      setState(() => _error = 'Could not continue as guest right now. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSignIn = _mode == _AuthMode.signIn;
    final bottom = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: ListView(
        padding: EdgeInsets.fromLTRB(24, MediaQuery.of(context).padding.top + 48, 24, 24 + bottom),
        children: [
          // ── Brand ────────────────────────────────────────────────────────
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 22),
          ),
          const SizedBox(height: 28),
          Text(
            isSignIn ? 'Welcome back' : 'Create account',
            style: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.7,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            isSignIn
                ? 'Sign in or continue as guest.'
                : 'Join the community, or continue as guest.',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),

          // ── Mode toggle ──────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.elevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderFaint, width: 0.8),
            ),
            child: Row(
              children: [
                _ModeTab(
                  label: 'Sign in',
                  selected: isSignIn,
                  onTap: () => setState(() { _mode = _AuthMode.signIn; _error = null; }),
                ),
                _ModeTab(
                  label: 'Sign up',
                  selected: !isSignIn,
                  onTap: () => setState(() { _mode = _AuthMode.signUp; _error = null; }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Email field ──────────────────────────────────────────────────
          _DarkField(
            controller: _emailController,
            hint: 'Email address',
            icon: Icons.mail_outline_rounded,
            keyboardType: TextInputType.emailAddress,
            enabled: !_loading,
          ),
          const SizedBox(height: 10),

          // ── Password field ───────────────────────────────────────────────
          Container(
            decoration: BoxDecoration(
              color: AppColors.elevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderFaint, width: 0.8),
            ),
            child: Row(
              children: [
                const Padding(
                  padding: EdgeInsets.only(left: 14),
                  child: Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.textTertiary),
                ),
                Expanded(
                  child: TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    enabled: !_loading,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Password',
                      hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () => setState(() => _obscurePassword = !_obscurePassword),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 14),
                    child: Icon(
                      _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      size: 17,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.25), width: 0.8),
              ),
              child: Text(
                _error!,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppColors.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
          const SizedBox(height: 22),

          // ── Primary action ───────────────────────────────────────────────
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _submitEmailAuth,
              child: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Text(
                      isSignIn ? 'Sign in' : 'Create account',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
            ),
          ),
          const SizedBox(height: 10),

          // ── Divider ──────────────────────────────────────────────────────
          Row(
            children: [
              Expanded(child: Container(height: 0.5, color: AppColors.divider)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'or',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
                ),
              ),
              Expanded(child: Container(height: 0.5, color: AppColors.divider)),
            ],
          ),
          const SizedBox(height: 10),

          // ── Guest ────────────────────────────────────────────────────────
          SizedBox(
            height: 50,
            child: OutlinedButton(
              onPressed: _loading ? null : _continueAsGuest,
              child: Text(
                'Continue as guest',
                style: GoogleFonts.inter(fontWeight: FontWeight.w500),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'You will choose a nickname in the next step.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }

  String _messageForAuthError(FirebaseAuthException e) {
    final rawMessage = e.message ?? '';
    if (rawMessage.contains('CONFIGURATION_NOT_FOUND')) {
      return 'Firebase Authentication is not configured for this project yet.';
    }
    switch (e.code) {
      case 'invalid-email': return 'Invalid email format.';
      case 'configuration-not-found': return 'Firebase Authentication is not initialized.';
      case 'invalid-api-key': return 'Firebase Web API key is invalid.';
      case 'app-not-authorized': return 'This app is not authorized in Firebase settings.';
      case 'admin-restricted-operation': return 'Anonymous sign-in is disabled.';
      case 'user-disabled': return 'This account has been disabled.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential': return 'Invalid email or password.';
      case 'email-already-in-use': return 'This email is already registered.';
      case 'weak-password': return 'Password is too weak.';
      case 'operation-not-allowed': return 'This sign-in method is not enabled.';
      case 'network-request-failed': return 'Network error. Check your connection.';
      default: return '${e.message ?? 'Authentication failed.'} (${e.code})';
    }
  }
}

// ── Mode tab ──────────────────────────────────────────────────────────────────

class _ModeTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ModeTab({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: selected ? AppColors.highlight : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            border: selected
                ? Border.all(color: AppColors.borderFaint, width: 0.8)
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              color: selected ? AppColors.textPrimary : AppColors.textTertiary,
            ),
          ),
        ),
      ),
    );
  }
}

// ── Dark text field ───────────────────────────────────────────────────────────

class _DarkField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool enabled;

  const _DarkField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.elevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        enabled: enabled,
        style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
          prefixIcon: Icon(icon, size: 18, color: AppColors.textTertiary),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }
}
