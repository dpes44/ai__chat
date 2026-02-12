import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/models/message_model.dart';
import 'package:ai_chat/src/services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

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
      final strings = context.strings;
      _messages.add(
        MessageModel(
          text: strings.helloMessage,
          isUser: false,
          timestamp: DateTime.now(),
        ),
      );
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
    if (text.isEmpty) return;
    if (_isSending) return;

    final strings = context.strings;
    final language = context.appLanguage;

    setState(() {
      _isSending = true;
      _messages.add(
        MessageModel(text: text, isUser: true, timestamp: DateTime.now()),
      );
      _messages.add(
        MessageModel(
          text: strings.aiTyping,
          isUser: false,
          timestamp: DateTime.now(),
        ),
      );
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
            _messages.removeWhere(
              (m) => m.text == strings.aiTyping && !m.isUser,
            );
            _messages.add(
              MessageModel(
                text: reply,
                isUser: false,
                timestamp: DateTime.now(),
              ),
            );
            _isSending = false;
          });
          _scrollToBottom();
        })
        .catchError((error) {
          if (!mounted) return;
          setState(() {
            _messages.removeWhere(
              (m) => m.text == strings.aiTyping && !m.isUser,
            );
            _messages.add(
              MessageModel(
                text: strings.fallbackReply,
                isUser: false,
                timestamp: DateTime.now(),
              ),
            );
            _isSending = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(strings.errorMessage)),
          );
          _scrollToBottom();
        });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = context.strings;

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final message = _messages[index];
              final isUser = message.isUser;
              final isTypingMessage =
                  !isUser && message.text == strings.aiTyping;

              if (!isUser) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        margin: const EdgeInsets.only(right: 8, bottom: 2),
                        decoration: const BoxDecoration(
                          color: AppColors.primarySurface,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.spa_rounded,
                          size: 16,
                          color: AppColors.primary,
                        ),
                      ),
                      Flexible(
                        child: Container(
                          constraints: BoxConstraints(
                            maxWidth:
                                MediaQuery.of(context).size.width * 0.72,
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: const BoxDecoration(
                            color: AppColors.aiBubble,
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(20),
                              topRight: Radius.circular(20),
                              bottomLeft: Radius.circular(6),
                              bottomRight: Radius.circular(20),
                            ),
                          ),
                          child: isTypingMessage
                              ? const _TypingIndicator()
                              : Text(
                                  message.text,
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: AppColors.textPrimary,
                                    height: 1.45,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return Align(
                alignment: Alignment.centerRight,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.72,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.userBubble,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(6),
                    ),
                  ),
                  child: Text(
                    message.text,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                      height: 1.45,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 12, 16),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(
              top: BorderSide(color: AppColors.divider, width: 0.5),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  enabled: !_isSending,
                  onSubmitted: (_) => _handleSend(),
                  decoration: InputDecoration(
                    hintText: strings.typeMessage,
                    fillColor: AppColors.inputFill,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 14,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: _isSending ? null : _handleSend,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _isSending
                        ? AppColors.primary.withValues(alpha: 0.4)
                        : AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_upward_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 20,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (index) {
          return AnimatedBuilder(
            listenable: _controller,
            builder: (context, child) {
              final delay = index * 0.2;
              final value = (_controller.value - delay).clamp(0.0, 1.0);
              final bounce = (value < 0.5)
                  ? (value * 2)
                  : (2 - value * 2);
              return Container(
                margin: EdgeInsets.only(right: index < 2 ? 6 : 0),
                child: Transform.translate(
                  offset: Offset(0, -4 * bounce),
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppColors.textTertiary
                          .withValues(alpha: 0.4 + 0.6 * bounce),
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
  final Widget Function(BuildContext context, Widget? child) builder;

  const AnimatedBuilder({
    super.key,
    required super.listenable,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return builder(context, null);
  }
}
