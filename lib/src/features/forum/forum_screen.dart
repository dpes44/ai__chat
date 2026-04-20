import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ai_chat/src/core/constants/app_colors.dart';
import 'package:ai_chat/src/models/forum_models.dart';
import 'package:ai_chat/src/services/forum_repository.dart';

class ForumScreen extends StatefulWidget {
  final String nickname;
  final String currentUserId;

  const ForumScreen({
    super.key,
    required this.nickname,
    required this.currentUserId,
  });

  @override
  State<ForumScreen> createState() => _ForumScreenState();
}

class _ForumScreenState extends State<ForumScreen> {
  bool _accepted = false;
  final _bodyController = TextEditingController();
  final ForumRepository _repository = ForumRepository();
  bool _posting = false;
  String? _error;

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _createThread() async {
    final body = _bodyController.text.trim();
    if (body.isEmpty) return;
    setState(() {
      _posting = true;
      _error = null;
    });
    try {
      await _repository.createThread(
        body: body,
        author: widget.nickname,
        authorUid: widget.currentUserId,
      );
      _bodyController.clear();
    } catch (e) {
      setState(() => _error = 'Could not post right now. Please try again.');
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _promptReply(ForumThread thread) async {
    final controller = TextEditingController();
    final reply = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.elevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              'Reply to ${thread.author}',
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              decoration: BoxDecoration(
                color: AppColors.highlight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderFaint, width: 0.8),
              ),
              child: TextField(
                controller: controller,
                maxLines: 4,
                autofocus: true,
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Type your reply...',
                  hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(controller.text.trim()),
                child: Text('Post reply', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
    if (reply != null && reply.trim().isNotEmpty) {
      try {
        await _repository.addReply(
          threadId: thread.id,
          body: reply.trim(),
          author: widget.nickname,
          authorUid: widget.currentUserId,
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not post reply: $e')),
        );
      }
    }
  }

  Future<void> _editThread(ForumThread thread) async {
    final controller = TextEditingController(text: thread.body);
    final updated = await _showEditSheet(controller, 'Edit post', 5);
    if (updated != null && updated.trim().isNotEmpty) {
      try {
        await _repository.updateThreadBody(threadId: thread.id, body: updated.trim());
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not edit post: $e')),
        );
      }
    }
  }

  Future<void> _deleteThread(ForumThread thread) async {
    final confirm = await _confirmDelete(context, 'Delete post?', 'This will remove the post and its replies.');
    if (confirm == true) {
      try {
        await _repository.deleteThread(thread.id);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not delete post: $e')),
        );
      }
    }
  }

  Future<void> _editReply(ForumThread thread, ForumReply reply) async {
    final controller = TextEditingController(text: reply.body);
    final updated = await _showEditSheet(controller, 'Edit reply', 4);
    if (updated != null && updated.trim().isNotEmpty) {
      try {
        await _repository.updateReply(
          threadId: thread.id,
          replyId: reply.id,
          body: updated.trim(),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not edit reply: $e')),
        );
      }
    }
  }

  Future<void> _deleteReply(ForumThread thread, ForumReply reply) async {
    final confirm = await _confirmDelete(context, 'Delete reply?', 'This will remove your reply.');
    if (confirm == true) {
      try {
        await _repository.deleteReply(threadId: thread.id, replyId: reply.id);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not delete reply: $e')),
        );
      }
    }
  }

  Future<String?> _showEditSheet(TextEditingController controller, String title, int maxLines) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.elevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              decoration: BoxDecoration(
                color: AppColors.highlight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderFaint, width: 0.8),
              ),
              child: TextField(
                controller: controller,
                maxLines: maxLines,
                autofocus: true,
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Type here...',
                  hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(controller.text.trim()),
                child: Text('Save', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool?> _confirmDelete(BuildContext ctx, String title, String body) {
    return showDialog<bool>(
      context: ctx,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;

    if (!_accepted) {
      return _SafetyGate(top: top, onAccept: () => setState(() => _accepted = true));
    }

    final viewInsets = MediaQuery.of(context).viewInsets;
    final viewPadding = MediaQuery.of(context).viewPadding;

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => FocusScope.of(context).unfocus(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            color: AppColors.surface,
            padding: EdgeInsets.fromLTRB(20, top + 14, 20, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Community',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Share, support, and learn together',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          Container(height: 0.5, color: AppColors.divider),

          // ── Thread feed ─────────────────────────────────────────────────
          Expanded(
            child: StreamBuilder<List<ForumThread>>(
              stream: _repository.threadsStream(limit: 50),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      'Could not load forum right now.',
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  );
                }
                final threads = snapshot.data ?? [];
                if (threads.isEmpty) {
                  return Center(
                    child: Text(
                      'No posts yet.\nStart the first conversation!',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, height: 1.6),
                    ),
                  );
                }
                return ListView.builder(
                  padding: EdgeInsets.fromLTRB(
                    16, 14, 16,
                    80 + viewPadding.bottom + viewInsets.bottom,
                  ),
                  itemCount: threads.length,
                  itemBuilder: (context, index) {
                    final thread = threads[index];
                    return _ThreadCard(
                      thread: thread,
                      currentUserId: widget.currentUserId,
                      currentUserNickname: widget.nickname,
                      onReply: () => _promptReply(thread),
                      onEdit: () => _editThread(thread),
                      onDelete: () => _deleteThread(thread),
                      repository: _repository,
                      onEditReply: (reply) => _editReply(thread, reply),
                      onDeleteReply: (reply) => _deleteReply(thread, reply),
                    );
                  },
                );
              },
            ),
          ),

          // ── Composer ────────────────────────────────────────────────────
          _Composer(
            controller: _bodyController,
            posting: _posting,
            error: _error,
            onSubmit: _createThread,
            bottomInset: viewInsets.bottom + viewPadding.bottom,
          ),
        ],
      ),
    );
  }
}

// ── Safety gate screen ────────────────────────────────────────────────────────

class _SafetyGate extends StatelessWidget {
  final double top;
  final VoidCallback onAccept;

  const _SafetyGate({required this.top, required this.onAccept});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Container(
            color: AppColors.surface,
            padding: EdgeInsets.fromLTRB(20, top + 14, 20, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Community',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'A safe space to connect',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Container(height: 0.5, color: AppColors.divider),
        ),
        SliverFillRemaining(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderFaint, width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: AppColors.primaryDim,
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: const Icon(
                              Icons.shield_outlined,
                              color: AppColors.primary,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'Community guidelines',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ..._rules.map((rule) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.only(top: 6, right: 10),
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                rule,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )),
                    ],
                  ),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: onAccept,
                    child: Text(
                      'I agree — enter forum',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
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

  static const _rules = [
    'Be kind and respectful to everyone.',
    'Avoid sharing personal identifying details.',
    'This is not an emergency space — use SOS for crises.',
    'Report anything harmful or abusive.',
  ];
}

// ── Thread card ───────────────────────────────────────────────────────────────

class _ThreadCard extends StatelessWidget {
  final ForumThread thread;
  final String currentUserId;
  final String currentUserNickname;
  final ForumRepository repository;
  final VoidCallback onReply;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final void Function(ForumReply reply) onEditReply;
  final void Function(ForumReply reply) onDeleteReply;

  const _ThreadCard({
    required this.thread,
    required this.currentUserId,
    required this.currentUserNickname,
    required this.repository,
    required this.onReply,
    required this.onEdit,
    required this.onDelete,
    required this.onEditReply,
    required this.onDeleteReply,
  });

  @override
  Widget build(BuildContext context) {
    final canEdit = thread.authorUid.isNotEmpty
        ? thread.authorUid == currentUserId
        : thread.author == currentUserNickname;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderFaint, width: 0.8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author row
            Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.primaryDim,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    thread.author.isNotEmpty
                        ? thread.author.characters.first.toUpperCase()
                        : '?',
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    thread.author,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Row(
                  children: [
                    if (canEdit)
                      PopupMenuButton<String>(
                        itemBuilder: (context) => [
                          PopupMenuItem(
                            value: 'edit',
                            child: Text('Edit', style: GoogleFonts.inter(fontSize: 13)),
                          ),
                          PopupMenuItem(
                            value: 'delete',
                            child: Text('Delete',
                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.error)),
                          ),
                        ],
                        onSelected: (value) {
                          if (value == 'edit') onEdit();
                          if (value == 'delete') onDelete();
                        },
                        icon: const Icon(Icons.more_horiz_rounded, size: 16, color: AppColors.textTertiary),
                      ),
                    const Icon(Icons.chat_bubble_outline_rounded, size: 12, color: AppColors.textTertiary),
                    const SizedBox(width: 4),
                    Text(
                      '${thread.replyCount}',
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '${thread.body}${thread.edited ? ' (edited)' : ''}',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.textPrimary,
                height: 1.55,
              ),
            ),
            const SizedBox(height: 10),

            // Replies
            StreamBuilder<List<ForumReply>>(
              stream: repository.repliesStream(thread.id, limit: 100),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const SizedBox(
                    height: 2,
                    child: LinearProgressIndicator(minHeight: 2),
                  );
                }
                final replies = snapshot.data ?? [];
                if (replies.isEmpty) {
                  return Row(
                    children: [
                      const Icon(Icons.subdirectory_arrow_right_rounded, size: 12, color: AppColors.textTertiary),
                      const SizedBox(width: 4),
                      Text(
                        'Be the first to reply',
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                      ),
                    ],
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: replies.map((reply) {
                    final canEditReply = reply.authorUid.isNotEmpty
                        ? reply.authorUid == currentUserId
                        : reply.author == currentUserNickname;
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 2,
                            height: 36,
                            margin: const EdgeInsets.only(right: 10, top: 2),
                            decoration: BoxDecoration(
                              color: AppColors.borderFaint,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      reply.author,
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.accent,
                                      ),
                                    ),
                                    if (reply.edited)
                                      Text(
                                        ' (edited)',
                                        style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                                      ),
                                    const Spacer(),
                                    if (canEditReply)
                                      PopupMenuButton<String>(
                                        itemBuilder: (context) => [
                                          PopupMenuItem(
                                            value: 'edit',
                                            child: Text('Edit', style: GoogleFonts.inter(fontSize: 13)),
                                          ),
                                          PopupMenuItem(
                                            value: 'delete',
                                            child: Text('Delete',
                                              style: GoogleFonts.inter(fontSize: 13, color: AppColors.error)),
                                          ),
                                        ],
                                        onSelected: (value) {
                                          if (value == 'edit') onEditReply(reply);
                                          if (value == 'delete') onDeleteReply(reply);
                                        },
                                        icon: const Icon(Icons.more_horiz_rounded,
                                          size: 14, color: AppColors.textTertiary),
                                      ),
                                  ],
                                ),
                                Text(
                                  reply.body,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                    height: 1.45,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onReply,
                icon: const Icon(Icons.reply_rounded, size: 13),
                label: Text('Reply', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500)),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Composer ──────────────────────────────────────────────────────────────────

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final bool posting;
  final String? error;
  final Future<void> Function() onSubmit;
  final double bottomInset;

  const _Composer({
    required this.controller,
    required this.posting,
    required this.error,
    required this.onSubmit,
    required this.bottomInset,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      padding: EdgeInsets.fromLTRB(14, 8, 14, 14 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (error != null) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 6, left: 4),
              child: Text(
                error!,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppColors.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
          Container(
            decoration: BoxDecoration(
              color: AppColors.elevated,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderFaint, width: 0.8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: controller,
                    minLines: 1,
                    maxLines: 4,
                    style: GoogleFonts.inter(fontSize: 13, color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Share a thought or question...',
                      hintStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textTertiary),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(7),
                  child: GestureDetector(
                    onTap: posting ? null : onSubmit,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        gradient: posting
                            ? null
                            : const LinearGradient(
                                colors: [AppColors.primary, Color(0xFF9B8AFF)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                        color: posting ? AppColors.highlight : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: posting
                          ? const Padding(
                              padding: EdgeInsets.all(9),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
