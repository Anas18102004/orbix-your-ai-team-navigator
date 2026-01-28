import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import JoinWorkspace from "./pages/JoinWorkspace";
import EmptyDashboard from "./pages/EmptyDashboard";
import AppLayout from "./components/layout/AppLayout";
import CrewDashboard from "./pages/dashboard/CrewDashboard";
import OrgAdminDashboard from "./pages/dashboard/OrgAdminDashboard";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import AIBrain from "./pages/AIBrain";
import Team from "./pages/Team";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ProjectDefinitionWizard from "./pages/ProjectDefinitionWizard";
import ProjectUpdates from "./pages/ProjectUpdates";
import Meetings from "./pages/Meetings";
import MeetingRoom from "./pages/MeetingRoom";
import MeetingDetail from "./pages/MeetingDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/project-wizard/:workspaceId" element={<ProjectDefinitionWizard />} />
          <Route path="/join-workspace" element={<JoinWorkspace />} />
          <Route path="/empty-dashboard" element={<EmptyDashboard />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<CrewDashboard />} />
            <Route path="org-admin" element={<OrgAdminDashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="chatbot" element={<AIBrain />} />
            <Route path="team" element={<Team />} />
            <Route path="updates" element={<ProjectUpdates />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="meetings/:meetingId" element={<MeetingDetail />} />
            <Route path="settings" element={<Profile />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
