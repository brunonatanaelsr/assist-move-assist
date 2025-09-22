import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loading } from "@/components/ui/loading";
import MainLayout from "@/components/layout/main-layout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy loaded pages
const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Auth = lazy(() => import("@/pages/Auth"));
const Beneficiarias = lazy(() => import("@/pages/BeneficiariasFixed"));
const CadastroBeneficiaria = lazy(() => import("@/pages/CadastroBeneficiaria"));
const DetalhesBeneficiaria = lazy(() => import("@/pages/DetalhesBeneficiaria"));
const EditarBeneficiaria = lazy(() => import("@/pages/EditarBeneficiaria"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const OficinasNew = lazy(() => import("@/pages/OficinasNew"));
const ParticipantesProjeto = () => null as any; // módulo legado desativado
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const EditarPerfil = lazy(() => import("@/components/EditarPerfil"));
const ChatInterno = lazy(() => import("@/pages/ChatInterno"));
const Atividades = lazy(() => import("@/pages/Atividades"));
const FeedNew = lazy(() => import("@/pages/FeedNew"));
const ProjetosNew = lazy(() => import("@/pages/ProjetosNew"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const FormulariosNavegacao = lazy(() => import("@/pages/FormulariosNavegacao"));
const FormularioGenerico = lazy(() => import("@/pages/FormularioGenerico"));
const DeclaracoesReciboGeral = lazy(() => import("@/pages/DeclaracoesReciboGeral"));
const AnamneseSocial = lazy(() => import("@/pages/formularios/AnamneseSocial"));
const RodaVida = lazy(() => import("@/pages/formularios/RodaVida"));
const FichaEvolucao = lazy(() => import("@/pages/formularios/FichaEvolucao"));
const DeclaracoesRecibos = lazy(() => import("@/pages/formularios/DeclaracoesRecibos"));
const TermosConsentimento = lazy(() => import("@/pages/formularios/TermosConsentimento"));
const VisaoHolistica = lazy(() => import("@/pages/formularios/VisaoHolistica"));
const FormulariosBeneficiaria = lazy(() => import("@/pages/formularios/FormulariosBeneficiaria"));
const EvolucaoBeneficiaria = lazy(() => import("@/pages/formularios/EvolucaoBeneficiaria"));
const PlanoAcao = lazy(() => import("@/pages/formularios/PlanoAcao"));
const MatriculaProjetos = lazy(() => import("@/pages/formularios/MatriculaProjetosFixed"));

const queryClient = new QueryClient();

/** Wrapper reutilizável: protege e aplica o MainLayout */
const ProtectedLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ProtectedRoute>
    <MainLayout>{children}</MainLayout>
  </ProtectedRoute>
);

/** Versão para rotas aninhadas: usa <Outlet /> */
const ProtectedLayoutOutlet: React.FC = () => (
  <ProtectedLayout>
    <Outlet />
  </ProtectedLayout>
);

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
                {/* Pública */}
                <Route path="/auth" element={<Auth />} />

                {/* Protegidas + Layout */}
                <Route path="/" element={<ProtectedLayoutOutlet />}>
                  {/* Home */}
                  <Route index element={<Index />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Beneficiárias (agrupadas) */}
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

                  {/* Demais páginas protegidas */}
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="oficinas" element={<OficinasNew />} />
                  <Route path="participantes" element={<ParticipantesProjeto />} />
                  <Route path="configuracoes">
                    <Route index element={<Configuracoes />} />
                    <Route path="perfil" element={<EditarPerfil />} />
                  </Route>
                  <Route path="chat-interno" element={<ChatInterno />} />
                  <Route path="declaracoes-recibos" element={<DeclaracoesReciboGeral />} />
                  <Route path="atividades" element={<Atividades />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="feed" element={<FeedNew />} />
                  <Route path="projetos" element={<ProjetosNew />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="notifications" element={<NotificationsPage />} />

                  {/* Formulários genéricos - Redirecionamento para beneficiárias */}
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
                  
                </Route>

                {/* Redirecionamento padrão se alguém cair em "/" sem contexto */}
                <Route path="" element={<Navigate to="/" replace />} />

                {/* 404 */}
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
