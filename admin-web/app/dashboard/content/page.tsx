"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/lib/client-api";

interface PromptContext {
  suicideHelpline: string;
  policeEmergency: string;
  ambulanceNumber: string;
  childHelpline: string;
  womenGbvHelpline: string;
  psychosocialHelpline: string;
}

interface ToolOptionConfig {
  labelEn: string;
  labelNp: string;
  score: number;
}

interface ToolQuestionConfig {
  textEn: string;
  textNp: string;
  options: ToolOptionConfig[];
}

interface ToolResponseConfig {
  min: number;
  max: number;
  textEn: string;
  textNp: string;
}

interface ToolConfig {
  id: string;
  nameEn: string;
  nameNp: string;
  summary: string;
  descriptionEn: string;
  descriptionNp: string;
  questions: ToolQuestionConfig[];
  responses: ToolResponseConfig[];
}

interface TherapistSubscriptionConfig {
  name: string;
  sessions: number;
  price: string;
  period: string;
  blurb: string;
  tag: string;
  featured: boolean;
  ctaLabel: string;
}

interface PromptSettings {
  promptContext: PromptContext;
  tools: ToolConfig[];
  therapistSubscriptions: TherapistSubscriptionConfig[];
}

const DEFAULT_PROMPTS: PromptSettings = {
  promptContext: {
    suicideHelpline: "988",
    policeEmergency: "911",
    ambulanceNumber: "112",
    childHelpline: "none",
    womenGbvHelpline: "none",
    psychosocialHelpline: "none",
  },
  tools: [],
  therapistSubscriptions: [],
};

function emptyToolOption(): ToolOptionConfig {
  return {
    labelEn: "",
    labelNp: "",
    score: 0,
  };
}

function emptyToolQuestion(): ToolQuestionConfig {
  return {
    textEn: "",
    textNp: "",
    options: [emptyToolOption()],
  };
}

function emptyToolResponse(): ToolResponseConfig {
  return {
    min: 0,
    max: 0,
    textEn: "",
    textNp: "",
  };
}

function emptyTool(): ToolConfig {
  return {
    id: "",
    nameEn: "",
    nameNp: "",
    summary: "",
    descriptionEn: "",
    descriptionNp: "",
    questions: [emptyToolQuestion()],
    responses: [emptyToolResponse()],
  };
}

function emptyTherapistSubscription(): TherapistSubscriptionConfig {
  return {
    name: "",
    sessions: 4,
    price: "",
    period: "/mo",
    blurb: "",
    tag: "",
    featured: false,
    ctaLabel: "Choose plan",
  };
}

function cloneTool(tool: ToolConfig): ToolConfig {
  return {
    ...tool,
    questions: tool.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
    })),
    responses: tool.responses.map((response) => ({ ...response })),
  };
}

type ContentSectionKey = "emergency" | "tools" | "therapist";

export default function ContentPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [state, setState] = useState<PromptSettings>(DEFAULT_PROMPTS);
  const [activeSection, setActiveSection] =
    useState<ContentSectionKey>("emergency");

  const [toolDraft, setToolDraft] = useState<ToolConfig>(emptyTool());
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  const [subscriptionDraft, setSubscriptionDraft] =
    useState<TherapistSubscriptionConfig>(emptyTherapistSubscription());
  const [editingSubscriptionIndex, setEditingSubscriptionIndex] = useState<number | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const persistState = async (nextState: PromptSettings, successMessage: string) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh this page and try again.");
      setNotice("");
      return false;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csrfToken, ...nextState }),
        },
        15000,
      );

      if (!res.ok) {
        setError(res.data.error ?? "Could not save content settings.");
        return false;
      }

      setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save content settings.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [csrfRes, contentRes] = await Promise.all([
          fetchJson<{ token?: string }>("/api/csrf"),
          fetchJson<{ data?: Partial<PromptSettings>; error?: string }>("/api/content"),
        ]);

        if (!csrfRes.ok || !csrfRes.data.token) {
          throw new Error("Could not initialize CSRF token.");
        }
        setCsrfToken(csrfRes.data.token);

        if (!contentRes.ok) {
          throw new Error(contentRes.data.error ?? "Could not load content settings.");
        }

        const data = contentRes.data.data;
        if (!data) {
          setState(DEFAULT_PROMPTS);
          return;
        }

        setState({
          promptContext: {
            ...DEFAULT_PROMPTS.promptContext,
            ...(data.promptContext ?? {}),
          },
          tools: Array.isArray(data.tools) ? data.tools : DEFAULT_PROMPTS.tools,
          therapistSubscriptions: Array.isArray(data.therapistSubscriptions)
            ? data.therapistSubscriptions
            : DEFAULT_PROMPTS.therapistSubscriptions,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load content settings.",
        );
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

  const startAddTool = () => {
    setEditingToolIndex(null);
    setToolDraft(emptyTool());
    setIsToolModalOpen(true);
    setError("");
    setNotice("");
  };

  const startEditTool = (index: number) => {
    setEditingToolIndex(index);
    setToolDraft(cloneTool(state.tools[index]!));
    setIsToolModalOpen(true);
    setError("");
    setNotice("");
  };

  const closeToolModal = () => {
    setIsToolModalOpen(false);
    setEditingToolIndex(null);
    setToolDraft(emptyTool());
  };

  const deleteTool = async (index: number) => {
    if (!window.confirm("Delete this tool?")) {
      return;
    }

    const nextState: PromptSettings = {
      ...state,
      tools: state.tools.filter((_, current) => current !== index),
    };

    setState(nextState);

    if (editingToolIndex === index) {
      setEditingToolIndex(null);
      setToolDraft(emptyTool());
    }

    await persistState(nextState, "Tool record deleted.");
  };

  const upsertTool = async () => {
    const normalized: ToolConfig = {
      ...toolDraft,
      id: toolDraft.id.trim(),
      nameEn: toolDraft.nameEn.trim(),
      nameNp: toolDraft.nameNp.trim(),
      summary: toolDraft.summary.trim(),
      descriptionEn: toolDraft.descriptionEn.trim(),
      descriptionNp: toolDraft.descriptionNp.trim(),
      questions: toolDraft.questions.map((question) => ({
        ...question,
        textEn: question.textEn.trim(),
        textNp: question.textNp.trim(),
        options: question.options.map((option) => ({
          ...option,
          labelEn: option.labelEn.trim(),
          labelNp: option.labelNp.trim(),
          score: Number(option.score) || 0,
        })),
      })),
      responses: toolDraft.responses.map((response) => ({
        ...response,
        min: Number(response.min) || 0,
        max: Number(response.max) || 0,
        textEn: response.textEn.trim(),
        textNp: response.textNp.trim(),
      })),
    };

    if (!normalized.id || !normalized.nameEn) {
      setError("Tool ID and English title are required.");
      setNotice("");
      return;
    }

    if (!normalized.questions.length) {
      setError("At least one question is required for a tool.");
      setNotice("");
      return;
    }

    if (
      normalized.questions.some(
        (question) => !question.textEn || question.options.length === 0,
      )
    ) {
      setError("Every question requires English text and at least one option.");
      setNotice("");
      return;
    }

    if (
      normalized.questions.some((question) =>
        question.options.some((option) => !option.labelEn),
      )
    ) {
      setError("Every option requires an English label.");
      setNotice("");
      return;
    }

    if (
      !normalized.responses.length ||
      normalized.responses.some((response) => !response.textEn)
    ) {
      setError("At least one response is required and each must have English text.");
      setNotice("");
      return;
    }

    const duplicateId = state.tools.some(
      (tool, index) => tool.id === normalized.id && index !== editingToolIndex,
    );

    if (duplicateId) {
      setError(`Tool ID "${normalized.id}" already exists.`);
      setNotice("");
      return;
    }

    const nextTools = [...state.tools];
    if (editingToolIndex === null) {
      nextTools.push(normalized);
    } else {
      nextTools[editingToolIndex] = normalized;
    }
    const nextState: PromptSettings = {
      ...state,
      tools: nextTools,
    };

    setState(nextState);

    const actionLabel = editingToolIndex === null ? "created" : "updated";
    setEditingToolIndex(null);
    setToolDraft(emptyTool());
    setIsToolModalOpen(false);
    await persistState(nextState, `Tool record ${actionLabel}.`);
  };

  const startAddSubscription = () => {
    setEditingSubscriptionIndex(null);
    setSubscriptionDraft(emptyTherapistSubscription());
    setIsSubscriptionModalOpen(true);
    setError("");
    setNotice("");
  };

  const startEditSubscription = (index: number) => {
    setEditingSubscriptionIndex(index);
    setSubscriptionDraft({ ...state.therapistSubscriptions[index]! });
    setIsSubscriptionModalOpen(true);
    setError("");
    setNotice("");
  };

  const closeSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
    setEditingSubscriptionIndex(null);
    setSubscriptionDraft(emptyTherapistSubscription());
  };

  const deleteSubscription = async (index: number) => {
    if (!window.confirm("Delete this subscription method?")) {
      return;
    }

    const nextState: PromptSettings = {
      ...state,
      therapistSubscriptions: state.therapistSubscriptions.filter(
        (_, current) => current !== index,
      ),
    };

    setState(nextState);

    if (editingSubscriptionIndex === index) {
      setEditingSubscriptionIndex(null);
      setSubscriptionDraft(emptyTherapistSubscription());
    }

    await persistState(nextState, "Subscription method deleted.");
  };

  const upsertSubscription = async () => {
    const normalized: TherapistSubscriptionConfig = {
      ...subscriptionDraft,
      name: subscriptionDraft.name.trim(),
      sessions: Number(subscriptionDraft.sessions) || 0,
      price: subscriptionDraft.price.trim(),
      period: subscriptionDraft.period.trim(),
      blurb: subscriptionDraft.blurb.trim(),
      tag: subscriptionDraft.tag.trim(),
      ctaLabel: subscriptionDraft.ctaLabel.trim(),
    };

    if (!normalized.name || normalized.sessions < 1 || !normalized.price) {
      setError("Subscription name, sessions, and price are required.");
      setNotice("");
      return;
    }

    const nextSubscriptions = [...state.therapistSubscriptions];
    if (editingSubscriptionIndex === null) {
      nextSubscriptions.push(normalized);
    } else {
      nextSubscriptions[editingSubscriptionIndex] = normalized;
    }
    const nextState: PromptSettings = {
      ...state,
      therapistSubscriptions: nextSubscriptions,
    };

    setState(nextState);

    const actionLabel =
      editingSubscriptionIndex === null ? "created" : "updated";
    setEditingSubscriptionIndex(null);
    setSubscriptionDraft(emptyTherapistSubscription());
    setIsSubscriptionModalOpen(false);
    await persistState(nextState, `Subscription method ${actionLabel}.`);
  };

  const onSave = async () => {
    await persistState(state, "Content settings saved.");
  };

  if (loading) {
    return (
      <div className="desktop-window">
        <div className="window-body">Loading content settings...</div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      <aside className="desktop-window content-side-nav">
        <div className="window-title">Content Menu</div>
        <div className="window-body">
          <button
            type="button"
            className={`content-nav-link ${
              activeSection === "emergency" ? "content-nav-link-active" : ""
            }`}
            onClick={() => setActiveSection("emergency")}
          >
            Emergency Numbers
          </button>
          <button
            type="button"
            className={`content-nav-link ${
              activeSection === "tools" ? "content-nav-link-active" : ""
            }`}
            onClick={() => setActiveSection("tools")}
          >
            Tools
          </button>
          <button
            type="button"
            className={`content-nav-link ${
              activeSection === "therapist" ? "content-nav-link-active" : ""
            }`}
            onClick={() => setActiveSection("therapist")}
          >
            Therapist Subscriptions
          </button>
        </div>
      </aside>

      <div className="desktop-window content-main-window">
        <div className="window-title">Content Settings</div>
        <div className="window-body">
          <section
            id="section-emergency"
            className={`content-section ${
              activeSection === "emergency" ? "" : "content-section-hidden"
            }`}
          >
            <h3>Emergency Numbers</h3>
            <div className="form-grid form-grid-2">
              <div>
                <label>Suicide Helpline</label>
                <input
                  value={state.promptContext.suicideHelpline}
                  onChange={(e) =>
                    updatePromptContext("suicideHelpline", e.target.value)
                  }
                />
              </div>
              <div>
                <label>Police Emergency</label>
                <input
                  value={state.promptContext.policeEmergency}
                  onChange={(e) =>
                    updatePromptContext("policeEmergency", e.target.value)
                  }
                />
              </div>
              <div>
                <label>Ambulance Number</label>
                <input
                  value={state.promptContext.ambulanceNumber}
                  onChange={(e) =>
                    updatePromptContext("ambulanceNumber", e.target.value)
                  }
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
                  onChange={(e) =>
                    updatePromptContext("womenGbvHelpline", e.target.value)
                  }
                />
              </div>
              <div>
                <label>Psychosocial Helpline</label>
                <input
                  value={state.promptContext.psychosocialHelpline}
                  onChange={(e) =>
                    updatePromptContext("psychosocialHelpline", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <section
            id="section-tools"
            className={`content-section ${
              activeSection === "tools" ? "" : "content-section-hidden"
            }`}
          >
            <h3>Tools</h3>
            <div className="desktop-window">
              <div className="window-title">Tools Records</div>
              <div className="window-body">
                <div className="actions-row">
                  <button type="button" onClick={startAddTool}>Add Tool Record</button>
                </div>

                <table className="table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title (EN)</th>
                      <th>Questions</th>
                      <th>Responses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tools.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No tool records yet.</td>
                      </tr>
                    ) : (
                      state.tools.map((tool, index) => (
                        <tr key={`${tool.id}-${index}`}>
                          <td>{tool.id}</td>
                          <td>{tool.nameEn}</td>
                          <td>{tool.questions.length}</td>
                          <td>{tool.responses.length}</td>
                          <td>
                            <div className="actions-row">
                              <button type="button" onClick={() => startEditTool(index)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteTool(index)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section
            id="section-therapist"
            className={`content-section ${
              activeSection === "therapist" ? "" : "content-section-hidden"
            }`}
          >
            <h3>Therapist Subscriptions</h3>
            <div className="desktop-window">
              <div className="window-title">Therapist Subscription Records</div>
              <div className="window-body">
                <div className="actions-row">
                  <button type="button" onClick={startAddSubscription}>
                    Add Subscription Method
                  </button>
                </div>

                <table className="table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sessions</th>
                      <th>Price</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.therapistSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No subscription methods yet.</td>
                      </tr>
                    ) : (
                      state.therapistSubscriptions.map((plan, index) => (
                        <tr key={`${plan.name}-${index}`}>
                          <td>{plan.name}</td>
                          <td>{plan.sessions}</td>
                          <td>{plan.price}</td>
                          <td>{plan.featured ? "yes" : "no"}</td>
                          <td>
                            <div className="actions-row">
                              <button
                                type="button"
                                onClick={() => startEditSubscription(index)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSubscription(index)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {isToolModalOpen ? (
            <div className="modal-backdrop" onClick={closeToolModal}>
              <div
                className="desktop-window modal-window modal-window-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="window-title">
                  {editingToolIndex === null ? "Add Tool" : `Edit Tool #${editingToolIndex + 1}`}
                </div>
                <div className="window-body modal-window-body">
                  {error ? <p className="error" style={{ marginTop: 0 }}>{error}</p> : null}
                  <div className="form-grid form-grid-2">
                    <div>
                      <label>Tool ID</label>
                      <input
                        value={toolDraft.id}
                        onChange={(e) =>
                          setToolDraft((prev) => ({ ...prev, id: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label>Title EN</label>
                      <input
                        value={toolDraft.nameEn}
                        onChange={(e) =>
                          setToolDraft((prev) => ({ ...prev, nameEn: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label>Title NP</label>
                      <input
                        value={toolDraft.nameNp}
                        onChange={(e) =>
                          setToolDraft((prev) => ({ ...prev, nameNp: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label>Summary</label>
                      <input
                        value={toolDraft.summary}
                        onChange={(e) =>
                          setToolDraft((prev) => ({ ...prev, summary: e.target.value }))
                        }
                      />
                    </div>
                    <div className="full-col">
                      <label>Description EN</label>
                      <textarea
                        rows={3}
                        value={toolDraft.descriptionEn}
                        onChange={(e) =>
                          setToolDraft((prev) => ({
                            ...prev,
                            descriptionEn: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="full-col">
                      <label>Description NP</label>
                      <textarea
                        rows={3}
                        value={toolDraft.descriptionNp}
                        onChange={(e) =>
                          setToolDraft((prev) => ({
                            ...prev,
                            descriptionNp: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Questions</label>
                    {toolDraft.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="card" style={{ marginTop: 8 }}>
                        <div className="form-grid form-grid-2">
                          <div>
                            <label>Question EN</label>
                            <input
                              value={question.textEn}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const questions = [...prev.questions];
                                  questions[questionIndex] = {
                                    ...questions[questionIndex]!,
                                    textEn: e.target.value,
                                  };
                                  return { ...prev, questions };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label>Question NP</label>
                            <input
                              value={question.textNp}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const questions = [...prev.questions];
                                  questions[questionIndex] = {
                                    ...questions[questionIndex]!,
                                    textNp: e.target.value,
                                  };
                                  return { ...prev, questions };
                                })
                              }
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <label>Options</label>
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="row" style={{ marginTop: 6 }}>
                              <div style={{ flex: 2, minWidth: 150 }}>
                                <input
                                  placeholder="Option EN"
                                  value={option.labelEn}
                                  onChange={(e) =>
                                    setToolDraft((prev) => {
                                      const questions = [...prev.questions];
                                      const options = [...questions[questionIndex]!.options];
                                      options[optionIndex] = {
                                        ...options[optionIndex]!,
                                        labelEn: e.target.value,
                                      };
                                      questions[questionIndex] = {
                                        ...questions[questionIndex]!,
                                        options,
                                      };
                                      return { ...prev, questions };
                                    })
                                  }
                                />
                              </div>
                              <div style={{ flex: 2, minWidth: 150 }}>
                                <input
                                  placeholder="Option NP"
                                  value={option.labelNp}
                                  onChange={(e) =>
                                    setToolDraft((prev) => {
                                      const questions = [...prev.questions];
                                      const options = [...questions[questionIndex]!.options];
                                      options[optionIndex] = {
                                        ...options[optionIndex]!,
                                        labelNp: e.target.value,
                                      };
                                      questions[questionIndex] = {
                                        ...questions[questionIndex]!,
                                        options,
                                      };
                                      return { ...prev, questions };
                                    })
                                  }
                                />
                              </div>
                              <div style={{ width: 110 }}>
                                <input
                                  type="number"
                                  placeholder="Score"
                                  value={option.score}
                                  onChange={(e) =>
                                    setToolDraft((prev) => {
                                      const questions = [...prev.questions];
                                      const options = [...questions[questionIndex]!.options];
                                      options[optionIndex] = {
                                        ...options[optionIndex]!,
                                        score: Number(e.target.value),
                                      };
                                      questions[questionIndex] = {
                                        ...questions[questionIndex]!,
                                        options,
                                      };
                                      return { ...prev, questions };
                                    })
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setToolDraft((prev) => {
                                    const questions = [...prev.questions];
                                    questions[questionIndex] = {
                                      ...questions[questionIndex]!,
                                      options: questions[questionIndex]!.options.filter(
                                        (_, current) => current !== optionIndex,
                                      ),
                                    };
                                    return { ...prev, questions };
                                  })
                                }
                                disabled={question.options.length <= 1}
                              >
                                Delete Option
                              </button>
                            </div>
                          ))}

                          <div className="actions-row" style={{ marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={() =>
                                setToolDraft((prev) => {
                                  const questions = [...prev.questions];
                                  questions[questionIndex] = {
                                    ...questions[questionIndex]!,
                                    options: [
                                      ...questions[questionIndex]!.options,
                                      emptyToolOption(),
                                    ],
                                  };
                                  return { ...prev, questions };
                                })
                              }
                            >
                              Add Option
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setToolDraft((prev) => ({
                                  ...prev,
                                  questions: prev.questions.filter(
                                    (_, current) => current !== questionIndex,
                                  ),
                                }))
                              }
                              disabled={toolDraft.questions.length <= 1}
                            >
                              Delete Question
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="actions-row" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setToolDraft((prev) => ({
                            ...prev,
                            questions: [...prev.questions, emptyToolQuestion()],
                          }))
                        }
                      >
                        Add Question
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Responses</label>
                    {toolDraft.responses.map((response, responseIndex) => (
                      <div key={responseIndex} className="card" style={{ marginTop: 8 }}>
                        <div className="row">
                          <div style={{ width: 120 }}>
                            <label>Min</label>
                            <input
                              type="number"
                              value={response.min}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const responses = [...prev.responses];
                                  responses[responseIndex] = {
                                    ...responses[responseIndex]!,
                                    min: Number(e.target.value),
                                  };
                                  return { ...prev, responses };
                                })
                              }
                            />
                          </div>
                          <div style={{ width: 120 }}>
                            <label>Max</label>
                            <input
                              type="number"
                              value={response.max}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const responses = [...prev.responses];
                                  responses[responseIndex] = {
                                    ...responses[responseIndex]!,
                                    max: Number(e.target.value),
                                  };
                                  return { ...prev, responses };
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="form-grid form-grid-2" style={{ marginTop: 6 }}>
                          <div>
                            <label>Response EN</label>
                            <textarea
                              rows={2}
                              value={response.textEn}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const responses = [...prev.responses];
                                  responses[responseIndex] = {
                                    ...responses[responseIndex]!,
                                    textEn: e.target.value,
                                  };
                                  return { ...prev, responses };
                                })
                              }
                            />
                          </div>
                          <div>
                            <label>Response NP</label>
                            <textarea
                              rows={2}
                              value={response.textNp}
                              onChange={(e) =>
                                setToolDraft((prev) => {
                                  const responses = [...prev.responses];
                                  responses[responseIndex] = {
                                    ...responses[responseIndex]!,
                                    textNp: e.target.value,
                                  };
                                  return { ...prev, responses };
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="actions-row" style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() =>
                              setToolDraft((prev) => ({
                                ...prev,
                                responses: prev.responses.filter(
                                  (_, current) => current !== responseIndex,
                                ),
                              }))
                            }
                            disabled={toolDraft.responses.length <= 1}
                          >
                            Delete Response
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="actions-row" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setToolDraft((prev) => ({
                            ...prev,
                            responses: [...prev.responses, emptyToolResponse()],
                          }))
                        }
                      >
                        Add Response
                      </button>
                    </div>
                  </div>

                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button type="button" onClick={upsertTool} className="btn-primary">
                      {editingToolIndex === null
                        ? "Create Tool Record"
                        : "Update Tool Record"}
                    </button>
                    <button type="button" onClick={startAddTool}>Clear</button>
                    <button type="button" onClick={closeToolModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isSubscriptionModalOpen ? (
            <div className="modal-backdrop" onClick={closeSubscriptionModal}>
              <div
                className="desktop-window modal-window"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="window-title">
                  {editingSubscriptionIndex === null
                    ? "Add Subscription Method"
                    : `Edit Subscription #${editingSubscriptionIndex + 1}`}
                </div>
                <div className="window-body modal-window-body">
                  {error ? <p className="error" style={{ marginTop: 0 }}>{error}</p> : null}
                  <div className="form-grid form-grid-2">
                    <div>
                      <label>Name</label>
                      <input
                        value={subscriptionDraft.name}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Sessions / Month</label>
                      <input
                        type="number"
                        min={1}
                        value={subscriptionDraft.sessions}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            sessions: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Price</label>
                      <input
                        value={subscriptionDraft.price}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Period</label>
                      <input
                        value={subscriptionDraft.period}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            period: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Tag</label>
                      <input
                        value={subscriptionDraft.tag}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            tag: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>CTA Label</label>
                      <input
                        value={subscriptionDraft.ctaLabel}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            ctaLabel: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Featured</label>
                      <select
                        value={subscriptionDraft.featured ? "true" : "false"}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            featured: e.target.value === "true",
                          }))
                        }
                      >
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    </div>
                    <div className="full-col">
                      <label>Blurb</label>
                      <textarea
                        rows={2}
                        value={subscriptionDraft.blurb}
                        onChange={(e) =>
                          setSubscriptionDraft((prev) => ({
                            ...prev,
                            blurb: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="actions-row" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={upsertSubscription}
                      className="btn-primary"
                    >
                      {editingSubscriptionIndex === null
                        ? "Create Subscription Method"
                        : "Update Subscription Method"}
                    </button>
                    <button type="button" onClick={startAddSubscription}>Clear</button>
                    <button type="button" onClick={closeSubscriptionModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="hint">{notice}</p> : null}

          <div className="actions-row">
            <button
              onClick={onSave}
              disabled={saving || !csrfToken}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save Content Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
