import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import JoinWorkspace from "./pages/JoinWorkspace";
import EmptyDashboard from "./pages/EmptyDashboard";
import AppLayout from "./components/layout/AppLayout";
import CrewDashboard from "./pages/dashboard/CrewDashboard";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import AIBrain from "./pages/AIBrain";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";

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
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/join-workspace" element={<JoinWorkspace />} />
          <Route path="/empty-dashboard" element={<EmptyDashboard />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<CrewDashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="ai" element={<AIBrain />} />
            <Route path="team" element={<Team />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
