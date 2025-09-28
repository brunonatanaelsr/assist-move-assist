import { lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { BeneficiariasRoutes } from "./beneficiarias.routes";
import { FormulariosRoutes } from "./formularios.routes";
import { FeaturesRoutes } from "./features.routes";
import { ProtectedLayoutOutlet } from "@/components/layout/ProtectedLayoutOutlet";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Auth = lazy(() => import("@/pages/Auth"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const EditarPerfil = lazy(() => import("@/components/EditarPerfil"));
const DeclaracoesReciboGeral = lazy(() => import("@/pages/DeclaracoesReciboGeral"));

export const ConfiguracoesRoute = () => (
  <Route
    path="configuracoes"
    element={(
      <ProtectedRoute adminOnly>
        <Outlet />
      </ProtectedRoute>
    )}
  >
    <Route index element={<Configuracoes />} />
    <Route path="perfil" element={<EditarPerfil />} />
  </Route>
);

export const AppRoutes = () => (
  <Routes>
    {/* Pública */}
    <Route path="/auth" element={<Auth />} />

    {/* Protegidas + Layout */}
    <Route path="/" element={<ProtectedLayoutOutlet />}>
      {/* Home */}
      <Route index element={<Index />} />
      <Route path="dashboard" element={<Dashboard />} />

      {/* Módulos principais */}
      <BeneficiariasRoutes />
      <FormulariosRoutes />
      <FeaturesRoutes />

      {/* Configurações */}
      <ConfiguracoesRoute />

      {/* Declarações e Recibos */}
      <Route path="declaracoes-recibos" element={<DeclaracoesReciboGeral />} />
    </Route>

    {/* Redirecionamento padrão */}
    <Route path="" element={<Navigate to="/" replace />} />

    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);