"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

export default function LoginPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const csrfRes = await fetchJson<{ token?: string }>("/api/csrf");
        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize login token.");
        }
        setCsrfToken(csrfRes.data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not initialize login page.");
      }
    };

    void init();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, csrfToken }),
        },
        15000,
      );

      if (!res.ok) {
        setError(res.data.error ?? "Login failed.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="desktop-window login-window">
      <div className="window-title">Admin Login</div>
      <div className="window-body">
        <p className="hint">Single-admin credential access.</p>

        <form onSubmit={onSubmit}>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div>
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="actions-row">
            <button type="submit" disabled={loading || !csrfToken} className="btn-primary">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
