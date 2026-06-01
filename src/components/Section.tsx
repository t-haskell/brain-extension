import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function Section({ title, description, count, children, defaultCollapsed = false }: SectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [userToggled, setUserToggled] = useState(false);
  const contentId = useId();

  useEffect(() => {
    if (!userToggled) {
      setCollapsed(defaultCollapsed);
    }
  }, [defaultCollapsed, userToggled]);

  return (
    <section className="section">
      <button
        className="section-heading"
        type="button"
        aria-controls={contentId}
        aria-expanded={!collapsed}
        onClick={() => {
          setUserToggled(true);
          setCollapsed((value) => !value);
        }}
      >
        <ChevronDown className={collapsed ? "chevron collapsed" : "chevron"} size={18} aria-hidden="true" />
        <span>{title}</span>
        {typeof count === "number" ? <span className="section-count">{count}</span> : null}
      </button>
      {description ? <p className="section-description">{description}</p> : null}
      {!collapsed ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}
