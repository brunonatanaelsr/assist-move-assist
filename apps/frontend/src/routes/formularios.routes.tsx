import { lazy } from "react";
import { Route } from "react-router-dom";

// Lazy loaded components
const FormulariosNavegacao = lazy(() => import("@/pages/FormulariosNavegacao"));
const FormularioGenerico = lazy(() => import("@/pages/FormularioGenerico"));

export const FormulariosRoutes = () => (
  <Route path="formularios">
    <Route index element={<FormulariosNavegacao />} />
    <Route path="anamnese" element={<FormulariosNavegacao />} />
    <Route path="evolucao" element={<FormulariosNavegacao />} />
    <Route path="termo" element={<FormulariosNavegacao />} />
    <Route path="visao" element={<FormulariosNavegacao />} />
    <Route path="roda-vida" element={<FormulariosNavegacao />} />
    <Route path="plano" element={<FormulariosNavegacao />} />
    <Route path="matricula" element={<FormulariosNavegacao />} />
    <Route path=":tipo" element={<FormularioGenerico />} />
    <Route path="*" element={<FormulariosNavegacao />} />
  </Route>
);