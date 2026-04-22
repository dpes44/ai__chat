import Link from "next/link";

export type ContentMenuItem =
  | "emergency"
  | "tools"
  | "therapist"
  | "legal"
  | "doctors"
  | "appointments"
  | "forum"
  | "mood"
  | "users";

interface ContentMenuProps {
  active?: ContentMenuItem;
  onSelectContentSection?: (section: "emergency" | "tools" | "therapist" | "legal") => void;
}

export default function ContentMenu(props: ContentMenuProps) {
  const isActive = (item: ContentMenuItem) =>
    props.active === item ? "content-nav-link-active" : "";

  return (
    <aside className="desktop-window content-side-nav">
      <div className="window-title">Content Menu</div>
      <div className="window-body">
        {props.onSelectContentSection ? (
          <button
            type="button"
            className={`content-nav-link ${isActive("emergency")}`}
            onClick={() => props.onSelectContentSection?.("emergency")}
          >
            Emergency Numbers
          </button>
        ) : (
          <Link className={`content-nav-link ${isActive("emergency")}`} href="/dashboard/content?section=emergency">
            Emergency Numbers
          </Link>
        )}
        {props.onSelectContentSection ? (
          <button
            type="button"
            className={`content-nav-link ${isActive("tools")}`}
            onClick={() => props.onSelectContentSection?.("tools")}
          >
            Tools
          </button>
        ) : (
          <Link className={`content-nav-link ${isActive("tools")}`} href="/dashboard/content?section=tools">
            Tools
          </Link>
        )}
        {props.onSelectContentSection ? (
          <button
            type="button"
            className={`content-nav-link ${isActive("therapist")}`}
            onClick={() => props.onSelectContentSection?.("therapist")}
          >
            Therapist Subscriptions
          </button>
        ) : (
          <Link className={`content-nav-link ${isActive("therapist")}`} href="/dashboard/content?section=therapist">
            Therapist Subscriptions
          </Link>
        )}
        {props.onSelectContentSection ? (
          <button
            type="button"
            className={`content-nav-link ${isActive("legal")}`}
            onClick={() => props.onSelectContentSection?.("legal")}
          >
            Terms & Privacy
          </button>
        ) : (
          <Link className={`content-nav-link ${isActive("legal")}`} href="/dashboard/content?section=legal">
            Terms & Privacy
          </Link>
        )}
        <Link className={`content-nav-link ${isActive("doctors")}`} href="/dashboard/appointments?section=doctors">
          Doctors
        </Link>
        <Link
          className={`content-nav-link ${isActive("appointments")}`}
          href="/dashboard/appointments?section=appointments"
        >
          Appointments
        </Link>
        <Link className={`content-nav-link ${isActive("forum")}`} href="/dashboard/forum">
          Forum
        </Link>
        <Link className={`content-nav-link ${isActive("mood")}`} href="/dashboard/mood">
          Mood
        </Link>
        <Link className={`content-nav-link ${isActive("users")}`} href="/dashboard/users">
          Users
        </Link>
      </div>
    </aside>
  );
}
