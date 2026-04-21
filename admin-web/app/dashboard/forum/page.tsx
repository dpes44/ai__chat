"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/client-api";
import ContentMenu from "@/components/ContentMenu";

type ContentFilter = "all" | "flagged" | "hidden";

type ThreadRow = {
  id: string;
  body: string;
  author: string;
  authorUid: string;
  createdAt: string;
  replyCount: number;
  edited: boolean;
  isFlagged: boolean;
  isHidden: boolean;
  moderationNote: string;
  moderatedBy: string;
  moderatedAt: string;
};

type ReplyRow = {
  id: string;
  threadId: string;
  body: string;
  author: string;
  authorUid: string;
  createdAt: string;
  edited: boolean;
  isFlagged: boolean;
  isHidden: boolean;
  moderationNote: string;
  moderatedBy: string;
  moderatedAt: string;
};

function formatDate(value: string): string {
  if (!value) {
    return "";
  }
  return value.replace("T", " ").slice(0, 16);
}

function textPreview(input: string, max = 150): string {
  const text = input.trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}...`;
}

function shouldIncludeItem(
  item: { isFlagged: boolean; isHidden: boolean; body: string; author: string; authorUid: string; moderationNote: string },
  query: string,
  filter: ContentFilter,
) {
  if (filter === "flagged" && !item.isFlagged) {
    return false;
  }
  if (filter === "hidden" && !item.isHidden) {
    return false;
  }

  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const haystack = [
    item.body,
    item.author,
    item.authorUid,
    item.moderationNote,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function ForumModerationPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const [csrfRes, moderationRes] = await Promise.all([
          fetchJson<{ token?: string }>("/api/csrf"),
          fetchJson<{ data?: { threads?: ThreadRow[]; replies?: ReplyRow[] }; error?: string }>(
            "/api/forum/moderation",
          ),
        ]);

        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize CSRF token.");
        }
        setCsrfToken(csrfRes.data.token);

        if (!moderationRes.ok) {
          throw new Error(moderationRes.data.error ?? "Could not load forum moderation data.");
        }

        setThreads(Array.isArray(moderationRes.data.data?.threads) ? moderationRes.data.data?.threads ?? [] : []);
        setReplies(Array.isArray(moderationRes.data.data?.replies) ? moderationRes.data.data?.replies ?? [] : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load forum moderation data.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredThreads = useMemo(
    () =>
      threads.filter((item) =>
        shouldIncludeItem(item, query, filter),
      ),
    [threads, query, filter],
  );

  const filteredReplies = useMemo(
    () =>
      replies.filter((item) =>
        shouldIncludeItem(item, query, filter),
      ),
    [replies, query, filter],
  );

  const moderateItem = async (params: {
    kind: "thread" | "reply";
    threadId: string;
    replyId?: string;
    isFlagged: boolean;
    isHidden: boolean;
    moderationNote: string;
  }) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh this page and try again.");
      setNotice("");
      return;
    }

    const key = `${params.kind}:${params.threadId}:${params.replyId ?? ""}`;
    setSavingKey(key);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/forum/moderation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrfToken,
            ...params,
          }),
        },
        15000,
      );

      if (!res.ok) {
        throw new Error(res.data.error ?? "Could not update moderation state.");
      }

      const now = new Date().toISOString();
      if (params.kind === "thread") {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === params.threadId
              ? {
                  ...thread,
                  isFlagged: params.isFlagged,
                  isHidden: params.isHidden,
                  moderationNote: params.moderationNote.trim(),
                  moderatedAt: now,
                }
              : thread,
          ),
        );
      } else {
        setReplies((prev) =>
          prev.map((reply) =>
            reply.threadId === params.threadId && reply.id === params.replyId
              ? {
                  ...reply,
                  isFlagged: params.isFlagged,
                  isHidden: params.isHidden,
                  moderationNote: params.moderationNote.trim(),
                  moderatedAt: now,
                }
              : reply,
          ),
        );
      }

      setNotice("Moderation state saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update moderation state.");
    } finally {
      setSavingKey("");
    }
  };

  if (loading) {
    return (
      <div className="content-layout">
        <ContentMenu active="forum" />
        <div className="content-main-window">
          <div className="desktop-window">
            <div className="window-title">Forum Moderation</div>
            <div className="window-body">Loading forum moderation data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      <ContentMenu active="forum" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">Forum Moderation</div>
          <div className="window-body">
            <p className="hint">
              Review all forum posts and replies. Flag inappropriate content and hide it from app users.
            </p>

            <div className="form-grid form-grid-2" style={{ marginTop: 8 }}>
              <div>
                <label>Search</label>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search body, author, UID, moderation note..."
                />
              </div>
              <div>
                <label>Filter</label>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ContentFilter)}
                >
                  <option value="all">All</option>
                  <option value="flagged">Flagged only</option>
                  <option value="hidden">Hidden only</option>
                </select>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
            {notice ? <p className="hint">{notice}</p> : null}
          </div>
        </div>

        <div className="desktop-window">
          <div className="window-title">Posts ({filteredThreads.length})</div>
          <div className="window-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Author</th>
                  <th>Post</th>
                  <th>Replies</th>
                  <th>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredThreads.map((thread) => (
                  <ForumModerationRow
                    key={`thread:${thread.id}`}
                    kind="thread"
                    threadId={thread.id}
                    createdAt={thread.createdAt}
                    author={thread.author}
                    authorUid={thread.authorUid}
                    body={thread.body}
                    meta={`replyCount=${thread.replyCount}${thread.edited ? " • edited" : ""}`}
                    referenceValue={thread.replyCount.toString()}
                    isFlagged={thread.isFlagged}
                    isHidden={thread.isHidden}
                    moderationNote={thread.moderationNote}
                    moderatedBy={thread.moderatedBy}
                    moderatedAt={thread.moderatedAt}
                    saving={savingKey === `thread:${thread.id}:`}
                    onSave={moderateItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="desktop-window">
          <div className="window-title">Replies ({filteredReplies.length})</div>
          <div className="window-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Author</th>
                  <th>Reply</th>
                  <th>Thread</th>
                  <th>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredReplies.map((reply) => (
                  <ForumModerationRow
                    key={`reply:${reply.threadId}:${reply.id}`}
                    kind="reply"
                    threadId={reply.threadId}
                    replyId={reply.id}
                    createdAt={reply.createdAt}
                    author={reply.author}
                    authorUid={reply.authorUid}
                    body={reply.body}
                    meta={reply.edited ? "edited" : ""}
                    referenceValue={reply.threadId}
                    isFlagged={reply.isFlagged}
                    isHidden={reply.isHidden}
                    moderationNote={reply.moderationNote}
                    moderatedBy={reply.moderatedBy}
                    moderatedAt={reply.moderatedAt}
                    saving={savingKey === `reply:${reply.threadId}:${reply.id}`}
                    onSave={moderateItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumModerationRow(props: {
  kind: "thread" | "reply";
  threadId: string;
  replyId?: string;
  createdAt: string;
  author: string;
  authorUid: string;
  body: string;
  meta: string;
  referenceValue: string;
  isFlagged: boolean;
  isHidden: boolean;
  moderationNote: string;
  moderatedBy: string;
  moderatedAt: string;
  saving: boolean;
  onSave: (params: {
    kind: "thread" | "reply";
    threadId: string;
    replyId?: string;
    isFlagged: boolean;
    isHidden: boolean;
    moderationNote: string;
  }) => Promise<void>;
}) {
  const [isFlagged, setIsFlagged] = useState(props.isFlagged);
  const [isHidden, setIsHidden] = useState(props.isHidden);
  const [moderationNote, setModerationNote] = useState(props.moderationNote);

  useEffect(() => {
    setIsFlagged(props.isFlagged);
    setIsHidden(props.isHidden);
    setModerationNote(props.moderationNote);
  }, [props.isFlagged, props.isHidden, props.moderationNote]);

  const moderationSummary = [
    isFlagged ? "flagged" : "not flagged",
    isHidden ? "hidden" : "visible",
    props.moderatedBy ? `by ${props.moderatedBy}` : "",
    props.moderatedAt ? formatDate(props.moderatedAt) : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <tr>
      <td>{formatDate(props.createdAt)}</td>
      <td>
        <div>{props.author}</div>
        <div className="hint">{props.authorUid}</div>
      </td>
      <td>
        <div>{textPreview(props.body)}</div>
        {props.meta ? <div className="hint">{props.meta}</div> : null}
      </td>
      <td>{props.referenceValue}</td>
      <td>
        <div className="row" style={{ gap: 12 }}>
          <label style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={isFlagged}
              onChange={(event) => setIsFlagged(event.target.checked)}
              style={{ width: "auto", marginRight: 6 }}
            />
            Flag
          </label>
          <label style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(event) => setIsHidden(event.target.checked)}
              style={{ width: "auto", marginRight: 6 }}
            />
            Hide
          </label>
        </div>
        <div style={{ marginTop: 6 }}>
          <input
            value={moderationNote}
            maxLength={500}
            onChange={(event) => setModerationNote(event.target.value)}
            placeholder="Moderation note (optional)"
          />
        </div>
        <div className="hint" style={{ marginTop: 4 }}>{moderationSummary}</div>
        <div style={{ marginTop: 6 }}>
          <button
            className="btn-primary"
            disabled={props.saving}
            onClick={() =>
              props.onSave({
                kind: props.kind,
                threadId: props.threadId,
                replyId: props.replyId,
                isFlagged,
                isHidden,
                moderationNote,
              })
            }
          >
            {props.saving ? "Saving..." : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
}
