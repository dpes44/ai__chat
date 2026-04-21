import Link from "next/link";

type InsightsItem = "health" | "audit";

export default function InsightsMenu(props: { active: InsightsItem }) {
  const isActive = (item: InsightsItem) =>
    props.active === item ? "content-nav-link-active" : "";

  return (
    <aside className="desktop-window content-side-nav">
      <div className="window-title">Insights Menu</div>
      <div className="window-body">
        <Link className={`content-nav-link ${isActive("health")}`} href="/dashboard/health">
          Health
        </Link>
        <Link className={`content-nav-link ${isActive("audit")}`} href="/dashboard/audit">
          Audit
        </Link>
      </div>
    </aside>
  );
}
