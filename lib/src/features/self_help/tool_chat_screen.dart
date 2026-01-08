import 'package:flutter/material.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/models/tool_item.dart';

class ToolChatScreen extends StatefulWidget {
  final ToolItem tool;

  const ToolChatScreen({super.key, required this.tool});

  @override
  State<ToolChatScreen> createState() => _ToolChatScreenState();
}

class _ToolChatScreenState extends State<ToolChatScreen> {
  final List<_Message> _messages = [];
  final ScrollController _scrollController = ScrollController();
  int _questionIndex = 0;
  bool _initialized = false;
  double _score = 0;
  bool _completed = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      _showDescriptionThenQuestion();
    }
  }

  void _showDescriptionThenQuestion() {
    final desc = context.appLanguage == AppLanguage.nepali
        ? widget.tool.descriptionNp
        : widget.tool.descriptionEn;
    if (desc.isNotEmpty) {
      _messages.add(_Message(text: desc, isUser: false));
    }
    _enqueueNextQuestion();
  }

  void _enqueueNextQuestion() {
    if (_completed) return;
    if (_questionIndex >= widget.tool.questions.length ||
        widget.tool.questions.isEmpty) {
      final response = _pickResponse();
      if (response != null) {
        _messages.add(
          _Message(text: response, isUser: false, isFeedback: true),
        );
      } else {
        _messages.add(
          _Message(
            text: 'Thanks for checking this tool. You can revisit anytime.',
            isUser: false,
          ),
        );
      }
      _completed = true;
      setState(() {});
      _scrollToBottom();
      return;
    }
    final q = widget.tool.questions[_questionIndex];
    final lang = context.appLanguage;
    setState(() {
      _messages.add(
        _Message(
          text: lang == AppLanguage.nepali ? q.textNp : q.textEn,
          isUser: false,
          options: q.options,
        ),
      );
    });
    _scrollToBottom();
  }

  void _answer(String text, {double score = 0}) {
    setState(() {
      _messages.add(_Message(text: text, isUser: true));
      _score += score;
    });
    _questionIndex++;
    Future.delayed(const Duration(milliseconds: 200), _enqueueNextQuestion);
    _scrollToBottom();
  }

  void _skip() {
    _answer('Skipped', score: 0);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  String? _pickResponse() {
    if (widget.tool.responses.isEmpty) return null;
    for (final r in widget.tool.responses) {
      if (_score >= r.min && _score <= r.max) {
        return context.appLanguage == AppLanguage.nepali ? r.textNp : r.textEn;
      }
    }
    final fallback = widget.tool.responses.last;
    return context.appLanguage == AppLanguage.nepali
        ? fallback.textNp
        : fallback.textEn;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.tool.nameEn),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFE9F6F1), Color(0xFFF5FAF8)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          itemCount: _messages.length,
          itemBuilder: (context, index) {
            final msg = _messages[index];
            return Align(
              alignment: msg.isUser
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: msg.isUser
                      ? AppColors.primary.withValues(alpha: 255 * 0.9)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.shadow,
                      blurRadius: 10,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      msg.text,
                      style: TextStyle(
                        color: msg.isUser
                            ? Colors.white
                            : msg.isFeedback
                            ? AppColors.primary
                            : AppColors.textDark,
                        fontSize: 15,
                        fontWeight: msg.isFeedback
                            ? FontWeight.w700
                            : FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                    if (!msg.isUser && msg.options != null) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ...msg.options!.map((opt) {
                            final label =
                                context.appLanguage == AppLanguage.nepali
                                ? opt.labelNp
                                : opt.labelEn;
                            return ChoiceChip(
                              label: Text(label),
                              selected: false,
                              onSelected: (_) =>
                                  _answer(label, score: opt.score),
                              selectedColor: AppColors.primary.withValues(
                                alpha: 255 * 0.14,
                              ),
                              labelStyle: TextStyle(
                                color: AppColors.textDark,
                                fontWeight: FontWeight.w600,
                              ),
                            );
                          }),
                          ActionChip(
                            label: const Text('Skip'),
                            onPressed: _skip,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Message {
  final String text;
  final bool isUser;
  final List<ToolOption>? options;
  final bool isFeedback;

  _Message({
    required this.text,
    required this.isUser,
    this.options,
    this.isFeedback = false,
  });
}
