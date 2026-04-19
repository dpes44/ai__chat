"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

type Provider = "openai" | "anthropic";

interface RouterConfig {
  activeProvider: Provider;
  activeModel: string;
  fallbackProvider: Provider;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  activeProvider: "openai",
  activeModel: "gpt-4o-mini",
  fallbackProvider: "anthropic",
  fallbackModel: "claude-3-haiku-20240307",
  temperature: 0.6,
  maxTokens: 256,
  enabled: true,
};

export default function RouterPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [state, setState] = useState<RouterConfig>(DEFAULT_ROUTER_CONFIG);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [csrfRes, configRes] = await Promise.all([
          fetchJson<{ token?: string }>("/api/csrf"),
          fetchJson<{ data?: Partial<RouterConfig>; error?: string }>("/api/router"),
        ]);

        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize CSRF token.");
        }
        setCsrfToken(csrfRes.data.token);

        if (!configRes.ok) {
          throw new Error(configRes.data.error ?? "Could not load router config.");
        }

        if (configRes.data.data) {
          const data = configRes.data.data;
          setState({
            activeProvider: (data.activeProvider as Provider) ?? DEFAULT_ROUTER_CONFIG.activeProvider,
            activeModel: data.activeModel ?? DEFAULT_ROUTER_CONFIG.activeModel,
            fallbackProvider: (data.fallbackProvider as Provider) ?? DEFAULT_ROUTER_CONFIG.fallbackProvider,
            fallbackModel: data.fallbackModel ?? DEFAULT_ROUTER_CONFIG.fallbackModel,
            temperature: data.temperature ?? DEFAULT_ROUTER_CONFIG.temperature,
            maxTokens: data.maxTokens ?? DEFAULT_ROUTER_CONFIG.maxTokens,
            enabled: data.enabled ?? DEFAULT_ROUTER_CONFIG.enabled,
          });
        } else {
          setState(DEFAULT_ROUTER_CONFIG);
          setNotice(
            "No router config found yet. Defaults are loaded; click Save to create app_config/ai_routing.",
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load router config.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const update = <K extends keyof RouterConfig>(key: K, value: RouterConfig[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/router",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken, ...state }),
        },
        15000,
      );

      if (!res.ok) {
        setError(res.data.error ?? "Could not save router config.");
        return;
      }

      setNotice("Router settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save router config.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="desktop-window"><div className="window-body">Loading router settings...</div></div>;
  }

  return (
    <div className="desktop-window">
      <div className="window-title">Model Router</div>
      <div className="window-body">
        <div className="hint">Global Active Model with one-step fallback. Prompt settings are now in a separate page.</div>

        <div className="form-grid form-grid-2" style={{ marginTop: 10 }}>
          <div>
            <label>Active Provider</label>
            <select
              value={state.activeProvider}
              onChange={(e) => update("activeProvider", e.target.value as Provider)}
            >
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
            </select>
          </div>
          <div>
            <label>Active Model</label>
            <input value={state.activeModel} onChange={(e) => update("activeModel", e.target.value)} />
          </div>
          <div>
            <label>Fallback Provider</label>
            <select
              value={state.fallbackProvider}
              onChange={(e) => update("fallbackProvider", e.target.value as Provider)}
            >
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
            </select>
          </div>
          <div>
            <label>Fallback Model</label>
            <input value={state.fallbackModel} onChange={(e) => update("fallbackModel", e.target.value)} />
          </div>
          <div>
            <label>Temperature</label>
            <input
              type="number"
              step="0.1"
              value={state.temperature}
              onChange={(e) => update("temperature", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Max Tokens</label>
            <input
              type="number"
              value={state.maxTokens}
              onChange={(e) => update("maxTokens", Number(e.target.value))}
            />
          </div>
          <div>
            <label>Enabled</label>
            <select
              value={state.enabled ? "true" : "false"}
              onChange={(e) => update("enabled", e.target.value === "true")}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="hint">{notice}</p> : null}

        <div className="actions-row">
          <button
            onClick={onSave}
            disabled={saving || !csrfToken}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Save Router"}
          </button>
        </div>
      </div>
    </div>
  );
}
