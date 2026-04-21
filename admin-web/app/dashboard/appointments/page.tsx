"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/lib/client-api";
import ContentMenu from "@/components/ContentMenu";

type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

type DoctorRow = {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  location: string;
  profileLink: string;
  photoUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppointmentRow = {
  id: string;
  userUid: string;
  userNickname: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  preferredDate: string;
  issueSummary: string;
  preferredLocation: string;
  onlineMeetingLink: string;
  note: string;
  status: AppointmentStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

type DoctorDraft = {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  location: string;
  profileLink: string;
  photoUrl: string;
  isActive: boolean;
};

const emptyDoctorDraft: DoctorDraft = {
  id: "",
  name: "",
  specialization: "",
  bio: "",
  location: "",
  profileLink: "",
  photoUrl: "",
  isActive: true,
};

function formatDate(value: string): string {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 16);
}

function shortText(value: string, max = 120): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const [csrfToken, setCsrfToken] = useState("");
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [doctorDraft, setDoctorDraft] = useState<DoctorDraft>(emptyDoctorDraft);
  const [loading, setLoading] = useState(true);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingAppointmentKey, setSavingAppointmentKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const section = searchParams.get("section")?.trim().toLowerCase();
  const focusedSection: "all" | "doctors" | "appointments" =
    section === "doctors" || section === "appointments" ? section : "all";
  const showingDoctors = focusedSection !== "appointments";
  const showingAppointments = focusedSection !== "doctors";

  const requestedAppointments = useMemo(
    () => appointments.filter((row) => row.status === "requested"),
    [appointments],
  );
  const confirmedAppointments = useMemo(
    () => appointments.filter((row) => row.status === "confirmed"),
    [appointments],
  );
  const closedAppointments = useMemo(
    () => appointments.filter((row) => row.status === "completed" || row.status === "cancelled"),
    [appointments],
  );

  const loadAll = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const [csrfRes, dataRes] = await Promise.all([
        fetchJson<{ token?: string }>("/api/csrf"),
        fetchJson<{
          data?: {
            doctors?: DoctorRow[];
            appointments?: AppointmentRow[];
          };
          error?: string;
        }>("/api/appointments"),
      ]);

      if (!csrfRes.ok || !csrfRes.data.token) {
        throw new Error("Could not initialize CSRF token.");
      }
      setCsrfToken(csrfRes.data.token);

      if (!dataRes.ok) {
        throw new Error(dataRes.data.error ?? "Could not load appointments data.");
      }

      setDoctors(Array.isArray(dataRes.data.data?.doctors) ? dataRes.data.data?.doctors ?? [] : []);
      setAppointments(
        Array.isArray(dataRes.data.data?.appointments)
          ? (dataRes.data.data?.appointments ?? [])
          : [],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load appointments data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const uploadDoctorPhoto = async (file: File) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh and try again.");
      setNotice("");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.set("csrfToken", csrfToken);
      formData.set("file", file);

      const response = await fetch("/api/appointments/doctor-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { photoUrl?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not upload doctor photo.");
      }

      const photoUrl = payload.data?.photoUrl?.trim() ?? "";
      if (!photoUrl) {
        throw new Error("Doctor photo upload did not return a URL.");
      }

      setDoctorDraft((prev) => ({ ...prev, photoUrl }));
      setNotice("Photo uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload doctor photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveDoctor = async () => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh and try again.");
      setNotice("");
      return;
    }

    if (!doctorDraft.name.trim() || !doctorDraft.specialization.trim()) {
      setError("Doctor name and specialization are required.");
      setNotice("");
      return;
    }

    setSavingDoctor(true);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string; doctorId?: string }>(
        "/api/appointments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrfToken,
            action: "upsertDoctor",
            doctorId: doctorDraft.id || undefined,
            name: doctorDraft.name,
            specialization: doctorDraft.specialization,
            bio: doctorDraft.bio,
            location: doctorDraft.location,
            profileLink: doctorDraft.profileLink,
            photoUrl: doctorDraft.photoUrl,
            isActive: doctorDraft.isActive,
          }),
        },
        15000,
      );

      if (!res.ok) {
        throw new Error(res.data.error ?? "Could not save doctor.");
      }

      await loadAll();
      setDoctorDraft(emptyDoctorDraft);
      setNotice("Doctor saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save doctor.");
    } finally {
      setSavingDoctor(false);
    }
  };

  const startEditDoctor = (doctor: DoctorRow) => {
    setDoctorDraft({
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      bio: doctor.bio,
      location: doctor.location,
      profileLink: doctor.profileLink,
      photoUrl: doctor.photoUrl,
      isActive: doctor.isActive,
    });
    setError("");
    setNotice("");
  };

  const saveAppointmentStatus = async (params: {
    appointmentId: string;
    status: AppointmentStatus;
    adminNote: string;
  }) => {
    if (!csrfToken) {
      setError("Missing CSRF token. Refresh and try again.");
      setNotice("");
      return;
    }

    setSavingAppointmentKey(params.appointmentId);
    setError("");
    setNotice("");

    try {
      const res = await fetchJson<{ error?: string }>(
        "/api/appointments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csrfToken,
            action: "updateAppointmentStatus",
            appointmentId: params.appointmentId,
            status: params.status,
            adminNote: params.adminNote,
          }),
        },
        15000,
      );

      if (!res.ok) {
        throw new Error(res.data.error ?? "Could not update appointment.");
      }

      setAppointments((prev) =>
        prev.map((row) =>
          row.id === params.appointmentId
            ? {
                ...row,
                status: params.status,
                adminNote: params.adminNote,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setNotice("Appointment updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update appointment.");
    } finally {
      setSavingAppointmentKey("");
    }
  };

  if (loading) {
    return (
      <div className="content-layout">
        <ContentMenu active={focusedSection === "appointments" ? "appointments" : "doctors"} />
        <div className="content-main-window">
          <div className="desktop-window">
            <div className="window-title">Appointments</div>
            <div className="window-body">Loading doctors and appointments...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      <ContentMenu active={focusedSection === "appointments" ? "appointments" : "doctors"} />
      <div className="content-main-window">
        {showingDoctors ? (
          <div id="doctors" className="desktop-window">
            <div className="window-title">Doctors</div>
            <div className="window-body">
              <p className="hint">Add doctors for the mobile booking list. Set inactive to hide them from users.</p>

              <div className="form-grid form-grid-2" style={{ marginTop: 8 }}>
                <div>
                  <label>Name</label>
                  <input
                    value={doctorDraft.name}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Specialization</label>
                  <input
                    value={doctorDraft.specialization}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({
                        ...prev,
                        specialization: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label>Location</label>
                  <input
                    value={doctorDraft.location}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Profile/Meeting Link</label>
                  <input
                    value={doctorDraft.profileLink}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({
                        ...prev,
                        profileLink: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label>Doctor Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadDoctorPhoto(file);
                      }
                      event.target.value = "";
                    }}
                  />
                  {uploadingPhoto ? <p className="hint">Uploading photo...</p> : null}
                  {doctorDraft.photoUrl ? (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={doctorDraft.photoUrl}
                        alt="Doctor"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "999px",
                          objectFit: "cover",
                          border: "1px solid #d1d5db",
                        }}
                      />
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() =>
                            setDoctorDraft((prev) => ({ ...prev, photoUrl: "" }))
                          }
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="full-col">
                  <label>Bio</label>
                  <textarea
                    value={doctorDraft.bio}
                    rows={3}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({ ...prev, bio: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Active</label>
                  <select
                    value={doctorDraft.isActive ? "true" : "false"}
                    onChange={(event) =>
                      setDoctorDraft((prev) => ({
                        ...prev,
                        isActive: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
              </div>

              <div className="actions-row">
                <button className="btn-primary" disabled={savingDoctor} onClick={saveDoctor}>
                  {savingDoctor ? "Saving..." : doctorDraft.id ? "Update Doctor" : "Add Doctor"}
                </button>
                <button
                  disabled={savingDoctor}
                  onClick={() => setDoctorDraft(emptyDoctorDraft)}
                >
                  Clear
                </button>
              </div>

              {error ? <p className="error">{error}</p> : null}
              {notice ? <p className="hint">{notice}</p> : null}

              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Specialization</th>
                    <th>Location</th>
                    <th>Active</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.id}>
                      <td>
                        {doctor.photoUrl ? (
                          <img
                            src={doctor.photoUrl}
                            alt={doctor.name}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "999px",
                              objectFit: "cover",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{doctor.name}</td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.location}</td>
                      <td>{String(doctor.isActive)}</td>
                      <td>{formatDate(doctor.updatedAt)}</td>
                      <td>
                        <button onClick={() => startEditDoctor(doctor)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {showingAppointments ? (
          <>
            <AppointmentsTableSection
              id="appointments"
              title={`Requested (${requestedAppointments.length})`}
              rows={requestedAppointments}
              savingKey={savingAppointmentKey}
              onSave={saveAppointmentStatus}
            />
            <AppointmentsTableSection
              title={`Confirmed (${confirmedAppointments.length})`}
              rows={confirmedAppointments}
              savingKey={savingAppointmentKey}
              onSave={saveAppointmentStatus}
            />
            <AppointmentsTableSection
              title={`Closed (${closedAppointments.length})`}
              rows={closedAppointments}
              savingKey={savingAppointmentKey}
              onSave={saveAppointmentStatus}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AppointmentsTableSection(props: {
  id?: string;
  title: string;
  rows: AppointmentRow[];
  savingKey: string;
  onSave: (params: {
    appointmentId: string;
    status: AppointmentStatus;
    adminNote: string;
  }) => Promise<void>;
}) {
  return (
    <div id={props.id} className="desktop-window">
      <div className="window-title">{props.title}</div>
      <div className="window-body">
        <table className="table">
          <thead>
            <tr>
              <th>Created</th>
              <th>User</th>
              <th>Doctor</th>
              <th>Preferred Date</th>
              <th>Issue</th>
              <th>Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <AppointmentRowEditor
                key={row.id}
                row={row}
                saving={props.savingKey === row.id}
                onSave={props.onSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppointmentRowEditor(props: {
  row: AppointmentRow;
  saving: boolean;
  onSave: (params: {
    appointmentId: string;
    status: AppointmentStatus;
    adminNote: string;
  }) => Promise<void>;
}) {
  const [status, setStatus] = useState<AppointmentStatus>(props.row.status);
  const [adminNote, setAdminNote] = useState(props.row.adminNote);

  useEffect(() => {
    setStatus(props.row.status);
    setAdminNote(props.row.adminNote);
  }, [props.row.status, props.row.adminNote]);

  return (
    <tr>
      <td>{formatDate(props.row.createdAt)}</td>
      <td>
        <div>{props.row.userNickname || "-"}</div>
        <div className="hint">{props.row.userUid}</div>
      </td>
      <td>
        <div>{props.row.doctorName}</div>
        <div className="hint">{props.row.doctorSpecialization}</div>
      </td>
      <td>{formatDate(props.row.preferredDate)}</td>
      <td>{shortText(props.row.issueSummary, 100)}</td>
      <td>
        {props.row.preferredLocation ? (
          <div className="hint">Location: {shortText(props.row.preferredLocation, 60)}</div>
        ) : null}
        {props.row.onlineMeetingLink ? (
          <div className="hint">Link: {shortText(props.row.onlineMeetingLink, 60)}</div>
        ) : null}
        {props.row.note ? (
          <div className="hint">Note: {shortText(props.row.note, 60)}</div>
        ) : null}
      </td>
      <td>
        <div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
          >
            <option value="requested">requested</option>
            <option value="confirmed">confirmed</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div style={{ marginTop: 6 }}>
          <input
            value={adminNote}
            maxLength={500}
            onChange={(event) => setAdminNote(event.target.value)}
            placeholder="Admin note"
          />
        </div>
        <div style={{ marginTop: 6 }}>
          <button
            className="btn-primary"
            disabled={props.saving}
            onClick={() =>
              props.onSave({
                appointmentId: props.row.id,
                status,
                adminNote,
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
