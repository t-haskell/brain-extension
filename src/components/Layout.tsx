import {
  Archive,
  Briefcase,
  CalendarCheck,
  FolderKanban,
  Home,
  Hourglass,
  Inbox,
  LayoutDashboard,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getWipState, isOpenTask } from "../domain/rules";
import { getCommandSections } from "../domain/selectors";
import { useBrain } from "../store/BrainStore";
import { useSettings } from "../store/SettingsStore";
import { CloudAccountChip } from "./CloudAccountChip";
import { DetailPane } from "./DetailPane";
import { QuickCapture } from "./QuickCapture";

const navItems = [
  { to: "/command", label: "Command", icon: LayoutDashboard },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/work", label: "Work", icon: Briefcase },
  { to: "/personal", label: "Personal", icon: Home },
  { to: "/waiting", label: "Waiting", icon: Hourglass },
  { to: "/incubator", label: "Incubator", icon: Archive },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/reviews/weekly", label: "Weekly Review", icon: CalendarCheck },
  { to: "/explorer", label: "Explorer", icon: Search },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal }
];

export function Layout() {
  const { snapshot, isLoaded } = useBrain();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const wip = getWipState(snapshot.tasks, settings.activeWorkLimit);
  const openTasks = snapshot.tasks.filter(isOpenTask);
  const commandSections = getCommandSections(snapshot, new Date());
  const navCounts = new Map<string, number>([
    ["/inbox", openTasks.filter((task) => task.status === "inbox").length],
    ["/work", openTasks.filter((task) => task.areaId === "work").length],
    ["/personal", openTasks.filter((task) => task.areaId === "personal").length],
    ["/waiting", openTasks.filter((task) => task.status === "waiting").length],
    ["/incubator", openTasks.filter((task) => task.status === "incubator").length],
    ["/projects", snapshot.projects.filter((project) => project.status === "active").length],
    ["/command", commandSections.reduce((total, section) => total + section.items.length, 0)]
  ]);

  function openCapacity() {
    navigate("/command");
    window.setTimeout(() => {
      const target = document.getElementById("lane-active-work") ?? document.querySelector(".signal-grid");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", target?.id ? `#${target.id}` : "#capacity");
    }, 0);
  }

  if (!isLoaded) {
    return <div className="loading">Loading local data...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <div>
            <h1>Command</h1>
            <p>Local-first external brain</p>
          </div>
        </div>
        <nav aria-label="Primary">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/command"}>
              <Icon size={17} aria-hidden="true" />
              <span className="nav-label">{label}</span>
              {navCounts.get(to) ? <span className="nav-count">{navCounts.get(to)}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <QuickCapture />
          <CloudAccountChip />
          <button
            type="button"
            className={wip.isOverLimit ? "wip-meter warning" : "wip-meter"}
            data-testid="wip-meter"
            onClick={openCapacity}
            title="View active work and WIP capacity"
          >
            <span className="wip-meter-label">Active {wip.activeCount}/{wip.limit}</span>
            <span className="wip-track" aria-hidden="true">
              <span className="wip-fill" style={{ width: `${Math.min(100, (wip.activeCount / wip.limit) * 100)}%` }} />
            </span>
            {wip.isOverLimit ? <strong> WIP limit exceeded</strong> : null}
          </button>
        </header>
        {wip.isOverLimit ? (
          <div className="wip-warning" role="alert">
            Hard WIP warning: choose one focus item and reduce active work to three items or fewer.
          </div>
        ) : null}
        <main className="main-pane">
          <Outlet />
        </main>
      </div>
      <DetailPane />
    </div>
  );
}
