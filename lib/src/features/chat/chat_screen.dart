import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/features/chat/domain/message_model.dart';
import 'package:ai_chat/src/features/chat/data/api_service.dart';

class ChatScreen extends StatefulWidget {
  final String nickname;
  final bool isGuest;

  const ChatScreen({
    super.key,
    required this.nickname,
    required this.isGuest,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<MessageModel> _messages = [];
  final ApiService _apiService = ApiService();
  bool _isSending = false;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _messages.add(MessageModel(
        text: context.strings.helloMessage,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSending) return;

    final strings = context.strings;
    final language = context.appLanguage;

    setState(() {
      _isSending = true;
      _messages.add(MessageModel(text: text, isUser: true, timestamp: DateTime.now()));
      _messages.add(MessageModel(text: strings.aiTyping, isUser: false, timestamp: DateTime.now()));
    });
    _controller.clear();
    _scrollToBottom();

    _apiService
        .sendMentalHealthMessage(
          userMessage: text,
          language: language,
          history: _messages.where((m) => m.text != strings.aiTyping).toList(),
        )
        .then((reply) {
          if (!mounted) return;
          setState(() {
            _messages.removeWhere((m) => m.text == strings.aiTyping && !m.isUser);
            _messages.add(MessageModel(text: reply, isUser: false, timestamp: DateTime.now()));
            _isSending = false;
          });
          _scrollToBottom();
        })
        .catchError((error) {
          if (!mounted) return;
          final detail = error.toString().replaceFirst('Exception: ', '').trim();
          final shortDetail = detail.length > 200 ? '${detail.substring(0, 200)}…' : detail;
          setState(() {
            _messages.removeWhere((m) => m.text == strings.aiTyping && !m.isUser);
            _messages.add(MessageModel(
              text: strings.fallbackReply,
              isUser: false,
              timestamp: DateTime.now(),
            ));
            _isSending = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(shortDetail.isEmpty ? strings.errorMessage : strings.errorMessage),
          ));
          _scrollToBottom();
        });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;
    final top = MediaQuery.of(context).padding.top;

    return Column(
      children: [
        // ── Custom header — replaces AppBar ──────────────────────────────
        Container(
          color: AppColors.surface,
          padding: EdgeInsets.fromLTRB(20, top + 14, 16, 14),
          child: Row(
            children: [
              // AI avatar — gradient square
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.accent],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(Icons.auto_awesome, size: 20, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sathi',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(right: 5),
                          decoration: const BoxDecoration(
                            color: AppColors.success,
                            shape: BoxShape.circle,
                          ),
                        ),
                        Text(
                          'Always here for you',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Container(height: 0.5, color: AppColors.divider),

        // ── Message list ────────────────────────────────────────────────
        Expanded(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            behavior: HitTestBehavior.translucent,
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isTyping = !msg.isUser && msg.text == strings.aiTyping;

                if (!msg.isUser) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Small AI icon
                        Container(
                          width: 28,
                          height: 28,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.primary, AppColors.accent],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: const Icon(Icons.auto_awesome, size: 13, color: Colors.white),
                        ),
                        Flexible(
                          child: Container(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.72,
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                            decoration: BoxDecoration(
                              color: AppColors.aiBubble,
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(18),
                                topRight: Radius.circular(18),
                                bottomLeft: Radius.circular(5),
                                bottomRight: Radius.circular(18),
                              ),
                              border: Border.all(
                                color: AppColors.borderFaint,
                                width: 0.8,
                              ),
                            ),
                            child: isTyping
                                ? const _TypingIndicator()
                                : Text(
                                    msg.text,
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: AppColors.textPrimary,
                                      height: 1.5,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                // User bubble — right
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.72,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: const BoxDecoration(
                        color: AppColors.userBubble,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(18),
                          topRight: Radius.circular(18),
                          bottomLeft: Radius.circular(18),
                          bottomRight: Radius.circular(5),
                        ),
                      ),
                      child: Text(
                        msg.text,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.white,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // ── Input bar ───────────────────────────────────────────────────
        Container(
          color: AppColors.background,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.elevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.borderFaint, width: 0.8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    enabled: !_isSending,
                    onSubmitted: (_) => _handleSend(),
                    minLines: 1,
                    maxLines: 5,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                    decoration: InputDecoration(
                      hintText: strings.typeMessage,
                      hintStyle: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textTertiary,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 13,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(7),
                  child: GestureDetector(
                    onTap: _isSending ? null : _handleSend,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        gradient: _isSending
                            ? null
                            : const LinearGradient(
                                colors: [AppColors.primary, Color(0xFF9B8AFF)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                        color: _isSending ? AppColors.highlight : null,
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: const Icon(
                        Icons.arrow_upward_rounded,
                        color: Colors.white,
                        size: 19,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Typing indicator ──────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 18,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          return AnimatedBuilder(
            listenable: _anim,
            builder: (context, _) {
              final delay = i * 0.22;
              final v = (_anim.value - delay).clamp(0.0, 1.0);
              final bounce = v < 0.5 ? v * 2 : 2 - v * 2;
              return Container(
                margin: EdgeInsets.only(right: i < 2 ? 5 : 0),
                child: Transform.translate(
                  offset: Offset(0, -4 * bounce),
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.35 + 0.65 * bounce),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              );
            },
          );
        }),
      ),
    );
  }
}

class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext, Widget?) builder;

  const AnimatedBuilder({
    super.key,
    required super.listenable,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) => builder(context, null);
}
