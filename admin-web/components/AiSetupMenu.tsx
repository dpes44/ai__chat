import Link from "next/link";

type AiSetupItem = "router" | "prompts" | "keys";

export default function AiSetupMenu(props: { active: AiSetupItem }) {
  const isActive = (item: AiSetupItem) =>
    props.active === item ? "content-nav-link-active" : "";

  return (
    <aside className="desktop-window content-side-nav">
      <div className="window-title">AI Setup Menu</div>
      <div className="window-body">
        <Link className={`content-nav-link ${isActive("router")}`} href="/dashboard/router">
          Router
        </Link>
        <Link className={`content-nav-link ${isActive("prompts")}`} href="/dashboard/prompts">
          Prompts
        </Link>
        <Link className={`content-nav-link ${isActive("keys")}`} href="/dashboard/keys">
          Keys
        </Link>
      </div>
    </aside>
  );
}
