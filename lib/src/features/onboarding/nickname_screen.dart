import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/features/home/home_shell.dart';
import 'package:ai_chat/src/services/user_profile_repository.dart';

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
    } catch (_) {
      // Keep screen usable even if profile prefill fails.
    }
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
      setState(() {
        _error = 'You are not logged in. Please authenticate first.';
      });
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

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
        if (e.code == 'permission-denied') {
          _error =
              'Nickname save is blocked by Firestore security rules. Deploy updated rules and try again.';
        } else {
          _error = e.message ?? 'Could not save nickname. Please try again.';
        }
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your nickname'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Pick a nickname',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This name is public in the forum. Avoid personal details.',
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _controller,
              onChanged: _updateValidity,
              autofocus: true,
              enabled: !_isSubmitting,
              decoration: const InputDecoration(
                labelText: 'Nickname',
                hintText: 'e.g., Sunbeam',
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
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isValid && !_isSubmitting ? _submit : null,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : const Text(
                        'Continue',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
