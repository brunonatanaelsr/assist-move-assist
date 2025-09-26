import { FC } from "react";
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import MainLayout from "@/components/layout/main-layout";

/** Versão para rotas aninhadas: usa <Outlet /> */
export const ProtectedLayoutOutlet: FC = () => (
  <ProtectedRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </ProtectedRoute>
);