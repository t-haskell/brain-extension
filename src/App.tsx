import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AreaView } from "./views/AreaView";
import { CommandView } from "./views/CommandView";
import { ExplorerView } from "./views/ExplorerView";
import { InboxView } from "./views/InboxView";
import { IncubatorView } from "./views/IncubatorView";
import { ProjectsView } from "./views/ProjectsView";
import { MonthlyIncubatorReviewView, WeeklyReviewView } from "./views/ReviewsView";
import { SettingsView } from "./views/SettingsView";
import { WaitingView } from "./views/WaitingView";
import { useSettings } from "./store/SettingsStore";

function StartPageRedirect() {
  const { settings, isLoaded } = useSettings();

  if (!isLoaded) {
    return null;
  }

  return <Navigate to={settings.startPagePath} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<StartPageRedirect />} />
        <Route path="/command" element={<CommandView />} />
        <Route path="/inbox" element={<InboxView />} />
        <Route path="/work" element={<AreaView areaId="work" />} />
        <Route path="/personal" element={<AreaView areaId="personal" />} />
        <Route path="/waiting" element={<WaitingView />} />
        <Route path="/incubator" element={<IncubatorView />} />
        <Route path="/projects" element={<ProjectsView />} />
        <Route path="/reviews/weekly" element={<WeeklyReviewView />} />
        <Route path="/reviews/incubator" element={<MonthlyIncubatorReviewView />} />
        <Route path="/explorer" element={<ExplorerView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
