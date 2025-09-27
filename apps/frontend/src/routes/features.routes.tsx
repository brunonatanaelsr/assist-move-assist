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
        <ProtectedRoute requiredPermissions={["relatorios.ler"]}>
          <Analytics />
        </ProtectedRoute>
      )}
    />
    <Route
      path="oficinas"
      element={(
        <ProtectedRoute requiredPermissions={["oficinas.ler"]}>
          <OficinasNew />
        </ProtectedRoute>
      )}
    />
    <Route
      path="participantes"
      element={(
        <ProtectedRoute requiredPermissions={["participacoes.ler"]}>
          <ParticipantesIndisponivel />
        </ProtectedRoute>
      )}
    />
    <Route
      path="chat-interno"
      element={(
        <ProtectedRoute requiredPermissions={["mensagens.ler"]}>
          <ChatInterno />
        </ProtectedRoute>
      )}
    />
    <Route
      path="atividades"
      element={(
        <ProtectedRoute requiredPermissions={["relatorios.ler"]}>
          <Atividades />
        </ProtectedRoute>
      )}
    />
    <Route
      path="calendar"
      element={(
        <ProtectedRoute requiredPermissions={["projetos.ler"]}>
          <CalendarPage />
        </ProtectedRoute>
      )}
    />
    <Route
      path="feed"
      element={(
        <ProtectedRoute requiredPermissions={["feed.ler"]}>
          <FeedNew />
        </ProtectedRoute>
      )}
    />
    <Route
      path="projetos"
      element={(
        <ProtectedRoute requiredPermissions={["projetos.ler"]}>
          <ProjetosNew />
        </ProtectedRoute>
      )}
    />
    <Route
      path="relatorios"
      element={(
        <ProtectedRoute requiredPermissions={["relatorios.ler"]}>
          <Relatorios />
        </ProtectedRoute>
      )}
    />
    <Route
      path="notifications"
      element={(
        <ProtectedRoute requiredPermissions={["mensagens.ler", "mensagens.criar"]} permissionMode="any">
          <NotificationsPage />
        </ProtectedRoute>
      )}
    />
  </>
);