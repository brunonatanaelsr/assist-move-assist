import { Suspense } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { FeaturesRoutes } from "../features.routes";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/services/apiService", () => ({
  apiService: {
    getDashboardStats: vi.fn().mockResolvedValue({ success: true, data: {} })
  }
}));

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: null }),
    delete: vi.fn().mockResolvedValue({})
  }
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderWithRouter = (initialEntry: string) => {
  const featuresTree = FeaturesRoutes({});
  const children = (featuresTree as any)?.props?.children;
  const featureRoutes = Array.isArray(children)
    ? children
    : children
      ? [children]
      : [];

  const Layout = () => <Outlet />;

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Suspense fallback={<div>Carregando...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Home</div>} />
            {featureRoutes}
          </Route>
        </Routes>
      </Suspense>
    </MemoryRouter>
  );
};

const baseAuthState = {
  user: {
    id: 1,
    nome: "Usuário Teste",
    email: "teste@example.com",
    papel: "admin",
    ativo: true
  },
  profile: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  isAuthenticated: true,
  isAdmin: true
};

describe("FeaturesRoutes RBAC", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it("permite que administradores acessem a rota de analytics", async () => {
    mockedUseAuth.mockReturnValue(baseAuthState);
    renderWithRouter("/analytics");

    expect(
      await screen.findByRole("heading", { name: /analytics/i })
    ).toBeInTheDocument();
  });

  it("redireciona usuários comuns ao tentar acessar analytics", async () => {
    mockedUseAuth.mockReturnValue({
      ...baseAuthState,
      isAdmin: false,
      user: { ...baseAuthState.user, papel: "profissional" }
    });

    renderWithRouter("/analytics");

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("heading", { name: /analytics/i })
    ).not.toBeInTheDocument();
  });

  it("permite que administradores acessem a rota de relatórios", async () => {
    mockedUseAuth.mockReturnValue(baseAuthState);

    renderWithRouter("/relatorios");

    expect(
      await screen.findByRole("heading", { name: /relatórios/i })
    ).toBeInTheDocument();
  });

  it("redireciona usuários comuns ao tentar acessar relatórios", async () => {
    mockedUseAuth.mockReturnValue({
      ...baseAuthState,
      isAdmin: false,
      user: { ...baseAuthState.user, papel: "profissional" }
    });

    renderWithRouter("/relatorios");

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("heading", { name: /relatórios/i })
    ).not.toBeInTheDocument();
  });
});

