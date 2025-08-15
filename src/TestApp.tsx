import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostgreSQLAuthProvider } from "./hooks/usePostgreSQLAuth";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const TestApp = () => (
  <QueryClientProvider client={queryClient}>
    <PostgreSQLAuthProvider>
      <BrowserRouter>
        <div style={{ padding: '20px' }}>
          <h1>Sistema Move Marias - Teste</h1>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <div>
                <h2>Dashboard Básico</h2>
                <p>Sistema funcionando!</p>
                <a href="/auth">Ir para Login</a>
              </div>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </PostgreSQLAuthProvider>
  </QueryClientProvider>
);

export default TestApp;
