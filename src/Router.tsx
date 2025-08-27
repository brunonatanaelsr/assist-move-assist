import { Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '@/components/PrivateRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { BeneficiariasPage } from '@/pages/BeneficiariasPage';
import { ProjetosPage } from '@/pages/ProjetosPage';
import { ProjetoForm } from '@/pages/ProjetoForm';
import { DetalheProjeto } from '@/pages/DetalheProjeto';
import { ProjetoAtividades } from '@/pages/ProjetoAtividades';
import { ProjetoParticipantes } from '@/pages/ProjetoParticipantes';
import { FormBuilder } from '@/pages/FormBuilder';
import { FormView } from '@/pages/FormView';
import { FormsPage } from '@/pages/FormsPage';
import { NotificationSettings } from '@/pages/NotificationSettings';
import { DashboardPage } from '@/pages/DashboardPage';
import { ReportTemplatesPage } from '@/pages/ReportTemplatesPage';
import { CalendarPage } from '@/pages/CalendarPage';

export function Router() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Rotas protegidas */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<ProjetosPage />} />
        
        {/* Projetos */}
        <Route path="/projetos" element={<ProjetosPage />} />
        <Route path="/projetos/novo" element={<ProjetoForm />} />
        <Route path="/projetos/:id" element={<DetalheProjeto />} />
        <Route path="/projetos/:id/editar" element={<ProjetoForm />} />
        <Route path="/projetos/:id/atividades" element={<ProjetoAtividades />} />
        <Route path="/projetos/:id/participantes" element={<ProjetoParticipantes />} />

        {/* Beneficiárias */}
        <Route path="/beneficiarias" element={<BeneficiariasPage />} />

        {/* Formulários */}
        <Route 
          path="/forms" 
          element={
            <PrivateRoute requiredRoles={['admin', 'coordinator']} />
          }
        >
          <Route index element={<FormsPage />} />
          <Route path="novo" element={<FormBuilder />} />
          <Route path=":id/editar" element={<FormBuilder />} />
        </Route>
        
        <Route path="/forms/:id" element={<FormView />} />
        
        {/* Notificações */}
        <Route path="/notifications/settings" element={<NotificationSettings />} />

        {/* Dashboard e Relatórios */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute requiredRoles={['admin', 'coordinator']} />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="reports" element={<ReportTemplatesPage />} />
        </Route>

        {/* Calendário */}
        <Route
          path="/calendar"
          element={
            <PrivateRoute requiredRoles={['admin', 'coordinator']} />
          }
        >
          <Route index element={<CalendarPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
