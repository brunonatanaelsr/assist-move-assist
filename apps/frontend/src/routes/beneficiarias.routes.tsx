import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded components
const Beneficiarias = lazy(() => import("@/pages/BeneficiariasFixed"));
const CadastroBeneficiaria = lazy(() => import("@/pages/CadastroBeneficiaria"));
const DetalhesBeneficiaria = lazy(() => import("@/pages/DetalhesBeneficiaria"));
const EditarBeneficiaria = lazy(() => import("@/pages/EditarBeneficiaria"));
const FormulariosBeneficiaria = lazy(() => import("@/pages/formularios/FormulariosBeneficiaria"));
const EvolucaoBeneficiaria = lazy(() => import("@/pages/formularios/EvolucaoBeneficiaria"));
const AnamneseSocial = lazy(() => import("@/pages/formularios/AnamneseSocial"));
const RodaVida = lazy(() => import("@/pages/formularios/RodaVida"));
const FichaEvolucao = lazy(() => import("@/pages/formularios/FichaEvolucao"));
const DeclaracoesRecibos = lazy(() => import("@/pages/formularios/DeclaracoesRecibos"));
const TermosConsentimento = lazy(() => import("@/pages/formularios/TermosConsentimento"));
const VisaoHolistica = lazy(() => import("@/pages/formularios/VisaoHolistica"));
const PlanoAcao = lazy(() => import("@/pages/formularios/PlanoAcao"));
const MatriculaProjetos = lazy(() => import("@/pages/formularios/MatriculaProjetosFixed"));

export const BeneficiariasRoutes = () => (
  <Route path="beneficiarias">
    <Route
      index
      element={(
        <ProtectedRoute requiredPermissions={["beneficiarias.ler"]}>
          <Beneficiarias />
        </ProtectedRoute>
      )}
    />
    <Route
      path="nova"
      element={(
        <ProtectedRoute requiredPermissions={["beneficiarias.criar"]}>
          <CadastroBeneficiaria />
        </ProtectedRoute>
      )}
    />
    <Route path=":id">
      <Route
        index
        element={(
          <ProtectedRoute requiredPermissions={["beneficiarias.ler"]}>
            <DetalhesBeneficiaria />
          </ProtectedRoute>
        )}
      />
      <Route
        path="editar"
        element={(
          <ProtectedRoute requiredPermissions={["beneficiarias.editar"]}>
            <EditarBeneficiaria />
          </ProtectedRoute>
        )}
      />
      <Route path="formularios">
        <Route
          index
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <FormulariosBeneficiaria />
            </ProtectedRoute>
          )}
        />
        <Route
          path="evolucao"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <EvolucaoBeneficiaria />
            </ProtectedRoute>
          )}
        />
        <Route
          path="anamnese-social"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <AnamneseSocial />
            </ProtectedRoute>
          )}
        />
        <Route
          path="roda-vida"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <RodaVida />
            </ProtectedRoute>
          )}
        />
        <Route
          path="ficha-evolucao"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <FichaEvolucao />
            </ProtectedRoute>
          )}
        />
        <Route
          path="declaracoes-recibos"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <DeclaracoesRecibos />
            </ProtectedRoute>
          )}
        />
        <Route
          path="termos-consentimento"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <TermosConsentimento />
            </ProtectedRoute>
          )}
        />
        <Route
          path="visao-holistica"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <VisaoHolistica />
            </ProtectedRoute>
          )}
        />
        <Route
          path="plano-acao"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <PlanoAcao />
            </ProtectedRoute>
          )}
        />
        <Route
          path="matricula-projetos"
          element={(
            <ProtectedRoute requiredPermissions={["formularios.ler"]}>
              <MatriculaProjetos />
            </ProtectedRoute>
          )}
        />
      </Route>
    </Route>
  </Route>
);