import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/core/constants/app_strings.dart';
import 'package:ai_chat/src/features/content/domain/tool_item.dart';

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
    if (_questionIndex >= widget.tool.questions.length || widget.tool.questions.isEmpty) {
      final response = _pickResponse();
      _messages.add(_Message(
        text: response ?? 'Thanks for checking this tool. You can revisit anytime.',
        isUser: false,
        isFeedback: response != null,
      ));
      _completed = true;
      setState(() {});
      _scrollToBottom();
      return;
    }
    final q = widget.tool.questions[_questionIndex];
    final lang = context.appLanguage;
    setState(() {
      _messages.add(_Message(
        text: lang == AppLanguage.nepali ? q.textNp : q.textEn,
        isUser: false,
        options: q.options,
      ));
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

  void _skip() => _answer('Skipped', score: 0);

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
    return context.appLanguage == AppLanguage.nepali ? fallback.textNp : fallback.textEn;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    final lang = context.appLanguage;
    final title = lang == AppLanguage.nepali ? widget.tool.nameNp : widget.tool.nameEn;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // ── Custom header ────────────────────────────────────────────────
          Container(
            color: AppColors.surface,
            padding: EdgeInsets.fromLTRB(16, top + 14, 16, 14),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.elevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderFaint, width: 0.8),
                    ),
                    child: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 15,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        widget.tool.summary,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),

          // ── Messages ─────────────────────────────────────────────────────
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];

                if (msg.isUser) {
                  return Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
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
                  );
                }

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
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
                            maxWidth: MediaQuery.of(context).size.width * 0.82,
                          ),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.aiBubble,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(18),
                              topRight: Radius.circular(18),
                              bottomLeft: Radius.circular(5),
                              bottomRight: Radius.circular(18),
                            ),
                            border: Border.all(color: AppColors.borderFaint, width: 0.8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg.text,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  color: msg.isFeedback ? AppColors.accent : AppColors.textPrimary,
                                  fontWeight: msg.isFeedback ? FontWeight.w600 : FontWeight.w400,
                                  height: 1.55,
                                ),
                              ),
                              if (msg.options != null && msg.options!.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 7,
                                  runSpacing: 7,
                                  children: [
                                    ...msg.options!.map((opt) {
                                      final label = context.appLanguage == AppLanguage.nepali
                                          ? opt.labelNp
                                          : opt.labelEn;
                                      return GestureDetector(
                                        onTap: () => _answer(label, score: opt.score),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 7,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppColors.highlight,
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(
                                              color: AppColors.primary.withValues(alpha: 0.4),
                                              width: 0.8,
                                            ),
                                          ),
                                          child: Text(
                                            label,
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.accent,
                                            ),
                                          ),
                                        ),
                                      );
                                    }),
                                    GestureDetector(
                                      onTap: _skip,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 7,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.elevated,
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: AppColors.borderFaint,
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          'Skip',
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors.textTertiary,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
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
