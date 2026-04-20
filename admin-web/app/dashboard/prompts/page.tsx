"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

interface PromptSettings {
  systemPromptTemplate: string;
}

const DEFAULT_PROMPTS: PromptSettings = {
  systemPromptTemplate: "",
};

export default function PromptsPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [state, setState] = useState<PromptSettings>(DEFAULT_PROMPTS);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [csrfRes, promptsRes] = await Promise.all([
          fetchJson<{ token?: string }>("/api/csrf"),
          fetchJson<{ data?: Partial<PromptSettings>; error?: string }>("/api/prompts"),
        ]);

        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize CSRF token.");
        }
        setCsrfToken(csrfRes.data.token);

        if (!promptsRes.ok) {
          throw new Error(promptsRes.data.error ?? "Could not load prompt settings.");
        }

        const data = promptsRes.data.data;
        if (!data) {
          setState(DEFAULT_PROMPTS);
          return;
        }

        setState({
          systemPromptTemplate:
            data.systemPromptTemplate ?? DEFAULT_PROMPTS.systemPromptTemplate,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load prompt settings.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/prompts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken, ...state }),
        },
        15000,
      );

      if (!res.ok) {
        setError(res.data.error ?? "Could not save prompt settings.");
        return;
      }

      setNotice("Prompt settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prompt settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="desktop-window">
        <div className="window-body">Loading prompt settings...</div>
      </div>
    );
  }

  return (
    <div className="desktop-window">
      <div className="window-title">Prompt Settings</div>
      <div className="window-body">
        <div className="hint">
          Configure the AI system prompt policy here. App content records (emergency numbers, tools, therapist subscriptions) are managed in Content.
        </div>

        <div style={{ marginTop: 10 }}>
          <label>System Prompt Template</label>
          <textarea
            rows={18}
            value={state.systemPromptTemplate}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                systemPromptTemplate: e.target.value,
              }))
            }
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="hint">{notice}</p> : null}

        <div className="actions-row">
          <button
            onClick={onSave}
            disabled={saving || !csrfToken || !state.systemPromptTemplate.trim()}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Save Prompt Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
