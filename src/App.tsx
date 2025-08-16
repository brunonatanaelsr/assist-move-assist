import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Beneficiarias from "./pages/Beneficiarias";
import CadastroBeneficiaria from "./pages/CadastroBeneficiaria";
import DetalhesBeneficiaria from "./pages/DetalhesBeneficiaria";
import EditarBeneficiaria from "./pages/EditarBeneficiaria";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/layout/main-layout";
import { PostgreSQLAuthProvider } from "./hooks/usePostgreSQLAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Analytics from "./pages/Analytics";
import OficinasNew from "./pages/OficinasNew";
import ParticipantesProjeto from "./pages/ParticipantesProjeto";
import Configuracoes from "./pages/Configuracoes";
import EditarPerfil from "./components/EditarPerfil";
import ChatInterno from "./pages/ChatInterno";
import Atividades from "./pages/Atividades";
import FeedNew from "./pages/FeedNew";
import ProjetosNew from "./pages/ProjetosNew";
import Relatorios from "./pages/Relatorios";
import FormularioGenerico from "./pages/FormularioGenerico";
import AnamneseSocial from "./pages/formularios/AnamneseSocial";
import RodaVida from "./pages/formularios/RodaVida";
import FichaEvolucao from "./pages/formularios/FichaEvolucao";
import DeclaracoesRecibos from "./pages/formularios/DeclaracoesRecibos";
import TermosConsentimento from "./pages/formularios/TermosConsentimento";
import VisaoHolistica from "./pages/formularios/VisaoHolistica";
import PlanoAcao from "./pages/formularios/PlanoAcao";
import MatriculaProjetos from "./pages/formularios/MatriculaProjetos";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PostgreSQLAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout>
                  <Index />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias" element={
              <ProtectedRoute>
                <MainLayout>
                  <Beneficiarias />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/nova" element={
              <ProtectedRoute>
                <MainLayout>
                  <CadastroBeneficiaria />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id" element={
              <ProtectedRoute>
                <MainLayout>
                  <DetalhesBeneficiaria />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/editar" element={
              <ProtectedRoute>
                <MainLayout>
                  <EditarBeneficiaria />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/anamnese-social" element={
              <ProtectedRoute>
                <MainLayout>
                  <AnamneseSocial />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/roda-vida" element={
              <ProtectedRoute>
                <MainLayout>
                  <RodaVida />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/ficha-evolucao" element={
              <ProtectedRoute>
                <MainLayout>
                  <FichaEvolucao />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/declaracoes-recibos" element={
              <ProtectedRoute>
                <MainLayout>
                  <DeclaracoesRecibos />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/termos-consentimento" element={
              <ProtectedRoute>
                <MainLayout>
                  <TermosConsentimento />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/visao-holistica" element={
              <ProtectedRoute>
                <MainLayout>
                  <VisaoHolistica />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/plano-acao" element={
              <ProtectedRoute>
                <MainLayout>
                  <PlanoAcao />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/beneficiarias/:id/formularios/matricula-projetos" element={
              <ProtectedRoute>
                <MainLayout>
                  <MatriculaProjetos />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <MainLayout>
                  <Analytics />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/oficinas" element={
              <ProtectedRoute>
                <MainLayout>
                  <OficinasNew />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/participantes" element={
              <ProtectedRoute>
                <MainLayout>
                  <ParticipantesProjeto />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <MainLayout>
                  <Configuracoes />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracoes/perfil" element={
              <ProtectedRoute>
                <MainLayout>
                  <EditarPerfil />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-interno" element={
              <ProtectedRoute>
                <MainLayout>
                  <ChatInterno />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/atividades" element={
              <ProtectedRoute>
                <MainLayout>
                  <Atividades />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/feed" element={
              <ProtectedRoute>
                <MainLayout>
                  <FeedNew />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/projetos" element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjetosNew />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <MainLayout>
                  <Relatorios />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/formularios/:tipo" element={
              <ProtectedRoute>
                <MainLayout>
                  <FormularioGenerico />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/formularios/*" element={
              <ProtectedRoute>
                <MainLayout>
                  <FormularioGenerico />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </PostgreSQLAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;