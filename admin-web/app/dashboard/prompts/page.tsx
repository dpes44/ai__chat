"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

interface PromptContext {
  emergencyNumbersText: string;
  suicideHelpline: string;
  policeEmergency: string;
  ambulanceNumber: string;
  childHelpline: string;
  womenGbvHelpline: string;
  psychosocialHelpline: string;
  connectToProfessionalAvailable: boolean;
  connectToProfessionalLabel: string;
  emergencyButtonAvailable: boolean;
  assessmentToolsAvailable: string;
}

interface PromptSettings {
  systemPromptTemplate: string;
  promptContext: PromptContext;
}

const DEFAULT_PROMPTS: PromptSettings = {
  systemPromptTemplate: "",
  promptContext: {
    emergencyNumbersText: "Emergency services: 911 | Mental health line: 988 | Medical advice: 112",
    suicideHelpline: "988",
    policeEmergency: "911",
    ambulanceNumber: "112",
    childHelpline: "none",
    womenGbvHelpline: "none",
    psychosocialHelpline: "none",
    connectToProfessionalAvailable: false,
    connectToProfessionalLabel: "none",
    emergencyButtonAvailable: true,
    assessmentToolsAvailable: "General Health Check-In, Depression Check-In",
  },
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
          systemPromptTemplate: data.systemPromptTemplate ?? DEFAULT_PROMPTS.systemPromptTemplate,
          promptContext: {
            ...DEFAULT_PROMPTS.promptContext,
            ...(data.promptContext ?? {}),
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load prompt settings.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const updatePromptContext = <K extends keyof PromptContext>(
    key: K,
    value: PromptContext[K],
  ) => {
    setState((prev) => ({
      ...prev,
      promptContext: {
        ...prev.promptContext,
        [key]: value,
      },
    }));
  };

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
    return <div className="desktop-window"><div className="window-body">Loading prompt settings...</div></div>;
  }

  return (
    <div className="desktop-window">
      <div className="window-title">Prompt Settings</div>
      <div className="window-body">
        <div className="hint">
          Use placeholders like <code>{"{{SELECTED_LANGUAGE}}"}</code>, <code>{"{{USER_REGION_OR_UNKNOWN}}"}</code>. Country is fixed to Nepal.
        </div>

        <div style={{ marginTop: 10 }}>
          <label>System Prompt Template</label>
          <textarea
            rows={14}
            value={state.systemPromptTemplate}
            onChange={(e) => setState((prev) => ({ ...prev, systemPromptTemplate: e.target.value }))}
          />
        </div>

        <div className="form-grid form-grid-2" style={{ marginTop: 12 }}>
          <div className="full-col">
            <label>Emergency Numbers Text</label>
            <textarea
              rows={2}
              value={state.promptContext.emergencyNumbersText}
              onChange={(e) => updatePromptContext("emergencyNumbersText", e.target.value)}
            />
          </div>
          <div>
            <label>Suicide Helpline</label>
            <input
              value={state.promptContext.suicideHelpline}
              onChange={(e) => updatePromptContext("suicideHelpline", e.target.value)}
            />
          </div>
          <div>
            <label>Police Emergency</label>
            <input
              value={state.promptContext.policeEmergency}
              onChange={(e) => updatePromptContext("policeEmergency", e.target.value)}
            />
          </div>
          <div>
            <label>Ambulance Number</label>
            <input
              value={state.promptContext.ambulanceNumber}
              onChange={(e) => updatePromptContext("ambulanceNumber", e.target.value)}
            />
          </div>
          <div>
            <label>Child Helpline</label>
            <input
              value={state.promptContext.childHelpline}
              onChange={(e) => updatePromptContext("childHelpline", e.target.value)}
            />
          </div>
          <div>
            <label>Women/GBV Helpline</label>
            <input
              value={state.promptContext.womenGbvHelpline}
              onChange={(e) => updatePromptContext("womenGbvHelpline", e.target.value)}
            />
          </div>
          <div>
            <label>Psychosocial Helpline</label>
            <input
              value={state.promptContext.psychosocialHelpline}
              onChange={(e) => updatePromptContext("psychosocialHelpline", e.target.value)}
            />
          </div>
          <div>
            <label>Connect to Professional Available</label>
            <select
              value={state.promptContext.connectToProfessionalAvailable ? "true" : "false"}
              onChange={(e) =>
                updatePromptContext("connectToProfessionalAvailable", e.target.value === "true")
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div>
            <label>Connect Label</label>
            <input
              value={state.promptContext.connectToProfessionalLabel}
              onChange={(e) => updatePromptContext("connectToProfessionalLabel", e.target.value)}
            />
          </div>
          <div>
            <label>Emergency Button Available</label>
            <select
              value={state.promptContext.emergencyButtonAvailable ? "true" : "false"}
              onChange={(e) =>
                updatePromptContext("emergencyButtonAvailable", e.target.value === "true")
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="full-col">
            <label>Assessment Tools Available</label>
            <textarea
              rows={2}
              value={state.promptContext.assessmentToolsAvailable}
              onChange={(e) => updatePromptContext("assessmentToolsAvailable", e.target.value)}
            />
          </div>
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

