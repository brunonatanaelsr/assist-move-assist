import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded components
const FormulariosNavegacao = lazy(() => import("@/pages/FormulariosNavegacao"));
const FormularioGenerico = lazy(() => import("@/pages/FormularioGenerico"));

export const FormulariosRoutes = () => (
  <Route path="formularios">
    <Route
      index
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="anamnese"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="evolucao"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="termo"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="visao"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="roda-vida"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="plano"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path="matricula"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
    <Route
      path=":tipo"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormularioGenerico />
        </ProtectedRoute>
      )}
    />
    <Route
      path="*"
      element={(
        <ProtectedRoute requiredPermissions={["formularios.ler"]}>
          <FormulariosNavegacao />
        </ProtectedRoute>
      )}
    />
  </Route>
);