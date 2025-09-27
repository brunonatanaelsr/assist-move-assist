import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded components
const Analytics = lazy(() => import("@/pages/Analytics"));
const OficinasNew = lazy(() => import("@/pages/OficinasNew"));
const ParticipantesIndisponivel = lazy(() => import("@/pages/ParticipantesIndisponivel"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ChatInterno = lazy(() => import("@/pages/ChatInterno"));
const Atividades = lazy(() => import("@/pages/Atividades"));
const FeedNew = lazy(() => import("@/pages/FeedNew"));
const ProjetosNew = lazy(() => import("@/pages/ProjetosNew"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));

export const FeaturesRoutes = () => (
  <>
    <Route
      path="analytics"
      element={(
        <ProtectedRoute adminOnly>
          <Analytics />
        </ProtectedRoute>
      )}
    />
    <Route path="oficinas" element={<OficinasNew />} />
    <Route path="participantes" element={<ParticipantesIndisponivel />} />
    <Route path="chat-interno" element={<ChatInterno />} />
    <Route path="atividades" element={<Atividades />} />
    <Route path="calendar" element={<CalendarPage />} />
    <Route path="feed" element={<FeedNew />} />
    <Route path="projetos" element={<ProjetosNew />} />
    <Route
      path="relatorios"
      element={(
        <ProtectedRoute adminOnly>
          <Relatorios />
        </ProtectedRoute>
      )}
    />
    <Route path="notifications" element={<NotificationsPage />} />
  </>
);