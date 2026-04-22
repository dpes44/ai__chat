import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/home/home_shell.dart';
import 'package:ai_chat/src/features/auth/data/user_profile_repository.dart';

class NicknameScreen extends StatefulWidget {
  const NicknameScreen({super.key, this.onSaved});

  final ValueChanged<String>? onSaved;

  @override
  State<NicknameScreen> createState() => _NicknameScreenState();
}

class _NicknameScreenState extends State<NicknameScreen> {
  final TextEditingController _controller = TextEditingController();
  final UserProfileRepository _profileRepository = UserProfileRepository();
  bool _isValid = false;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prefillIfExistingNickname();
  }

  Future<void> _prefillIfExistingNickname() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final profile = await _profileRepository.fetchProfile(user.uid);
      final nickname = profile?.nickname.trim() ?? '';
      if (!mounted || nickname.isEmpty) return;
      _controller.text = nickname;
      setState(() => _isValid = true);
    } catch (_) {}
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _updateValidity(String value) {
    setState(() => _isValid = value.trim().isNotEmpty);
  }

  Future<void> _submit() async {
    final nickname = _controller.text.trim();
    if (nickname.isEmpty) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      setState(() => _error = 'You are not logged in. Please authenticate first.');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() { _isSubmitting = true; _error = null; });

    try {
      final ok = await _profileRepository.claimNickname(
        uid: user.uid,
        nickname: nickname,
        isGuest: user.isAnonymous,
      );
      if (!ok) {
        setState(() {
          _error = 'That nickname is taken. Try another one.';
          _isSubmitting = false;
        });
        return;
      }
      if (!mounted) return;
      if (widget.onSaved != null) {
        widget.onSaved!(nickname);
        return;
      }
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => HomeShell(
            nickname: nickname,
            currentUserId: user.uid,
            isGuest: user.isAnonymous,
          ),
        ),
      );
    } on FirebaseException catch (e) {
      setState(() {
        _error = e.code == 'permission-denied'
            ? 'Nickname save is blocked by Firestore security rules.'
            : (e.message ?? 'Could not save nickname. Please try again.');
        _isSubmitting = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Could not save nickname. Please try again.';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final bottom = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Padding(
        padding: EdgeInsets.fromLTRB(24, top + 24, 24, 24 + bottom),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Step indicator
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primaryDim,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Almost there',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.accent,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Pick a nickname',
              style: GoogleFonts.inter(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                letterSpacing: -0.7,
                height: 1.15,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This name is visible in the community forum.\nAvoid sharing personal details.',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.55,
              ),
            ),
            const SizedBox(height: 28),

            // Input
            Container(
              decoration: BoxDecoration(
                color: AppColors.elevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderFaint, width: 0.8),
              ),
              child: TextField(
                controller: _controller,
                onChanged: _updateValidity,
                autofocus: true,
                enabled: !_isSubmitting,
                style: GoogleFonts.inter(fontSize: 16, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'e.g., Sunbeam',
                  hintStyle: GoogleFonts.inter(fontSize: 16, color: AppColors.textTertiary),
                  prefixIcon: const Icon(Icons.person_outline_rounded, size: 18, color: AppColors.textTertiary),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 10),
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

            const Spacer(),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isValid && !_isSubmitting ? _submit : null,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        'Continue',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
