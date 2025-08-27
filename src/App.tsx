import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loading } from "@/components/ui/loading";
import MainLayout from "@/components/layout/main-layout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const Beneficiarias = lazy(() => import("@/pages/Beneficiarias"));
const CadastroBeneficiaria = lazy(() => import("@/pages/CadastroBeneficiaria"));
const DetalhesBeneficiaria = lazy(() => import("@/pages/DetalhesBeneficiaria"));
const EditarBeneficiaria = lazy(() => import("@/pages/EditarBeneficiaria"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const OficinasNew = lazy(() => import("@/pages/OficinasNew"));
const ParticipantesProjeto = lazy(() => import("@/pages/ParticipantesProjeto"));
// Lazy load remaining pages
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const EditarPerfil = lazy(() => import("@/components/EditarPerfil"));
const ChatInterno = lazy(() => import("@/pages/ChatInterno"));
const Atividades = lazy(() => import("@/pages/Atividades"));
const FeedNew = lazy(() => import("@/pages/FeedNew"));
const ProjetosNew = lazy(() => import("@/pages/ProjetosNew"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const FormularioGenerico = lazy(() => import("@/pages/FormularioGenerico"));
const AnamneseSocial = lazy(() => import("@/pages/formularios/AnamneseSocial"));
const RodaVida = lazy(() => import("@/pages/formularios/RodaVida"));
const FichaEvolucao = lazy(() => import("@/pages/formularios/FichaEvolucao"));
const DeclaracoesRecibos = lazy(() => import("@/pages/formularios/DeclaracoesRecibos"));
const TermosConsentimento = lazy(() => import("@/pages/formularios/TermosConsentimento"));
const VisaoHolistica = lazy(() => import("@/pages/formularios/VisaoHolistica"));
const PlanoAcao = lazy(() => import("@/pages/formularios/PlanoAcao"));
const MatriculaProjetos = lazy(() => import("@/pages/formularios/MatriculaProjetos"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<Loading fullScreen message="Carregando aplicação..." />}>
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
            </Suspense>
          </HashRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;