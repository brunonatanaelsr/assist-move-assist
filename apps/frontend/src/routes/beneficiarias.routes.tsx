import { lazy } from "react";
import { Route } from "react-router-dom";

// Lazy loaded components
const Beneficiarias = lazy(() => import("@/pages/Beneficiarias"));
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
    <Route index element={<Beneficiarias />} />
    <Route path="nova" element={<CadastroBeneficiaria />} />
    <Route path=":id">
      <Route index element={<DetalhesBeneficiaria />} />
      <Route path="editar" element={<EditarBeneficiaria />} />
      <Route path="formularios">
        <Route index element={<FormulariosBeneficiaria />} />
        <Route path="evolucao" element={<EvolucaoBeneficiaria />} />
        <Route path="anamnese-social" element={<AnamneseSocial />} />
        <Route path="roda-vida" element={<RodaVida />} />
        <Route path="ficha-evolucao" element={<FichaEvolucao />} />
        <Route path="declaracoes-recibos" element={<DeclaracoesRecibos />} />
        <Route path="termos-consentimento" element={<TermosConsentimento />} />
        <Route path="visao-holistica" element={<VisaoHolistica />} />
        <Route path="plano-acao" element={<PlanoAcao />} />
        <Route path="matricula-projetos" element={<MatriculaProjetos />} />
      </Route>
    </Route>
  </Route>
);