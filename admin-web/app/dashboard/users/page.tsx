"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/client-api";
import ContentMenu from "@/components/ContentMenu";

type UserTypeFilter = "all" | "guest" | "registered";
type StatusFilter = "all" | "active" | "banned";
type ProfileFilter = "with_profile" | "without_profile" | "all";

type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  nickname: string;
  userType: "guest" | "registered";
  isGuest: boolean;
  isBanned: boolean;
  profileIsGuest: boolean | null;
  profileExists: boolean;
  providers: string[];
  createdAt: string;
  lastSignInAt: string;
};

function formatDate(value: string): string {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function matchesQuery(row: AdminUserRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    row.uid,
    row.email,
    row.displayName,
    row.nickname,
    row.userType,
    row.providers.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function UsersPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("with_profile");
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const apiScopeForProfileFilter = (value: ProfileFilter): "withProfile" | "withoutProfile" | "allAuth" => {
    if (value === "with_profile") return "withProfile";
    if (value === "without_profile") return "withoutProfile";
    return "allAuth";
  };

  const loadData = async (scope: ProfileFilter) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const apiScope = apiScopeForProfileFilter(scope);
      const [csrfRes, usersRes] = await Promise.all([
        fetchJson<{ token?: string }>("/api/csrf"),
        fetchJson<{
          data?: { users?: AdminUserRow[]; truncated?: boolean };
          error?: string;
        }>(`/api/users?scope=${apiScope}`),
      ]);

      if (!csrfRes.ok || !csrfRes.data.token) {
        throw new Error("Could not initialize CSRF token.");
      }
      setCsrfToken(csrfRes.data.token);

      if (!usersRes.ok) {
        throw new Error(usersRes.data.error ?? "Could not load users.");
      }

      setRows(Array.isArray(usersRes.data.data?.users) ? usersRes.data.data?.users ?? [] : []);
      setTruncated(usersRes.data.data?.truncated === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(profileFilter);
  }, [profileFilter]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!matchesQuery(row, query)) return false;
        if (userTypeFilter !== "all" && row.userType !== userTypeFilter) return false;
        if (statusFilter === "banned" && !row.isBanned) return false;
        if (statusFilter === "active" && row.isBanned) return false;
        return true;
      }),
    [rows, query, userTypeFilter, statusFilter],
  );

  const toggleBan = async (row: AdminUserRow) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh this page and try again.");
      setNotice("");
      return;
    }

    const nextBanned = !row.isBanned;
    const message = nextBanned
      ? `Ban user ${row.uid}? This will disable login immediately.`
      : `Unban user ${row.uid}?`;
    if (!window.confirm(message)) {
      return;
    }

    setWorkingKey(`ban:${row.uid}`);
    setError("");
    setNotice("");
    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrfToken,
            action: "setBanStatus",
            uid: row.uid,
            banned: nextBanned,
          }),
        },
        15000,
      );

      if (!res.ok) {
        throw new Error(res.data.error ?? "Could not update user status.");
      }

      setRows((prev) =>
        prev.map((item) =>
          item.uid === row.uid
            ? {
                ...item,
                isBanned: nextBanned,
              }
            : item,
        ),
      );

      setNotice(nextBanned ? "User banned." : "User unbanned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user status.");
    } finally {
      setWorkingKey("");
    }
  };

  const deleteUser = async (row: AdminUserRow) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh this page and try again.");
      setNotice("");
      return;
    }

    const message =
      `Delete user ${row.uid} permanently?\n\n` +
      "This removes auth access and user-linked app data (profile, moods, appointments, and forum content).";

    if (!window.confirm(message)) {
      return;
    }

    setWorkingKey(`delete:${row.uid}`);
    setError("");
    setNotice("");
    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrfToken,
            action: "deleteUser",
            uid: row.uid,
          }),
        },
        30000,
      );

      if (!res.ok) {
        throw new Error(res.data.error ?? "Could not delete user.");
      }

      setRows((prev) => prev.filter((item) => item.uid !== row.uid));
      setNotice("User deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user.");
    } finally {
      setWorkingKey("");
    }
  };

  if (loading) {
    return (
      <div className="content-layout">
        <ContentMenu active="users" />
        <div className="content-main-window">
          <div className="desktop-window">
            <div className="window-title">Users</div>
            <div className="window-body">Loading users...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      <ContentMenu active="users" />
      <div className="content-main-window">
        <div className="desktop-window">
          <div className="window-title">Users</div>
          <div className="window-body">
            <p className="hint">
              Users are sourced from Firebase Authentication. App profile details come from Firestore
              <code> users </code>.
            </p>
            {truncated ? (
              <p className="hint">
                User list is truncated by ADMIN_USERS_LIST_LIMIT. Increase the env value to load more.
              </p>
            ) : null}

            <div className="form-grid form-grid-2" style={{ marginTop: 8 }}>
              <div>
                <label>Search</label>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by uid, email, nickname..."
                />
              </div>
              <div>
                <label>User Type</label>
                <select
                  value={userTypeFilter}
                  onChange={(event) => setUserTypeFilter(event.target.value as UserTypeFilter)}
                >
                  <option value="all">All</option>
                  <option value="guest">Guest</option>
                  <option value="registered">Registered</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div>
                <label>Profile Scope</label>
                <select
                  value={profileFilter}
                  onChange={(event) => setProfileFilter(event.target.value as ProfileFilter)}
                >
                  <option value="with_profile">With profile only</option>
                  <option value="all">All auth users</option>
                  <option value="without_profile">Auth-only (no profile)</option>
                </select>
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
            {notice ? <p className="hint">{notice}</p> : null}

            <div className="actions-row">
              <button onClick={() => void loadData(profileFilter)} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="desktop-window">
          <div className="window-title">User List ({filteredRows.length})</div>
          <div className="window-body">
            <table className="table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Nickname</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Sign In</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No users found for current filters.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const banning = workingKey === `ban:${row.uid}`;
                    const deleting = workingKey === `delete:${row.uid}`;
                    return (
                      <tr key={row.uid}>
                        <td>
                          <div>{row.uid}</div>
                          {row.displayName ? <div className="hint">{row.displayName}</div> : null}
                          {row.providers.length > 0 ? (
                            <div className="hint">providers: {row.providers.join(", ")}</div>
                          ) : (
                            <div className="hint">providers: anonymous</div>
                          )}
                        </td>
                        <td>{row.userType}</td>
                        <td>{row.email || "-"}</td>
                        <td>
                          <div>{row.nickname || "-"}</div>
                          <div className="hint">
                            profile: {row.profileExists ? "yes" : "no"}
                            {row.profileIsGuest === null ? "" : ` • isGuest=${String(row.profileIsGuest)}`}
                          </div>
                        </td>
                        <td>{row.isBanned ? "banned" : "active"}</td>
                        <td>{formatDate(row.createdAt)}</td>
                        <td>{formatDate(row.lastSignInAt)}</td>
                        <td>
                          <div className="actions-row" style={{ marginTop: 0 }}>
                            <button
                              className="btn-primary"
                              disabled={Boolean(workingKey)}
                              onClick={() => void toggleBan(row)}
                            >
                              {banning
                                ? "Updating..."
                                : row.isBanned
                                  ? "Unban"
                                  : "Ban"}
                            </button>
                            <button
                              disabled={Boolean(workingKey)}
                              onClick={() => void deleteUser(row)}
                            >
                              {deleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
