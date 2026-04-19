"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

type Provider = "openai" | "anthropic";
type KeyStatus = { configured: boolean; version: number; updatedAt?: string };

export default function KeysPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [status, setStatus] = useState<Record<Provider, KeyStatus> | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    const res = await fetchJson<{ data?: Record<Provider, KeyStatus>; error?: string }>(
      "/api/keys/rotate",
    );
    if (!res.ok) {
      throw new Error(res.data.error ?? "Could not load provider key status.");
    }
    setStatus(res.data.data ?? null);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        const csrfRes = await fetchJson<{ token?: string }>("/api/csrf");
        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize CSRF token.");
        }
        setCsrfToken(csrfRes.data.token);
        await loadStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not initialize key page.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const onRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetchJson<{ error?: string; version?: number }>(
        "/api/keys/rotate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken, provider, newApiKey }),
        },
        15000,
      );

      if (!res.ok) {
        setError(res.data.error ?? "Key update failed.");
        return;
      }

      setMessage(`Key updated. Version: ${res.data.version ?? "unknown"}`);
      setNewApiKey("");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="desktop-window"><div className="window-body">Loading key status...</div></div>;
  }

  return (
    <div className="desktop-window">
      <div className="window-title">Provider Keys</div>
      <div className="window-body">
        <p className="hint">Encrypted key storage. Raw key values are never displayed.</p>

        {status ? (
          <table className="table" style={{ marginTop: 8, marginBottom: 12 }}>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Configured</th>
                <th>Version</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {(["openai", "anthropic"] as Provider[]).map((item) => (
                <tr key={item}>
                  <td>{item}</td>
                  <td>{String(status[item]?.configured ?? false)}</td>
                  <td>{status[item]?.version ?? 0}</td>
                  <td>{status[item]?.updatedAt ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <form onSubmit={onRotate}>
          <div className="form-grid form-grid-2">
            <div>
              <label>Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
                <option value="openai">openai</option>
                <option value="anthropic">anthropic</option>
              </select>
            </div>
            <div>
              <label>New API Key</label>
              <input
                type="password"
                autoComplete="new-password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                required
                minLength={16}
              />
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {message ? <p className="hint">{message}</p> : null}

          <div className="actions-row">
            <button type="submit" disabled={!csrfToken || saving} className="btn-primary">
              {saving ? "Updating..." : "Update Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
