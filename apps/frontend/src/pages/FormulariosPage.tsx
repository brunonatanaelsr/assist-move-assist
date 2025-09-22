import React from 'react';
import { Link } from 'react-router-dom';
// Página desativada até implementarmos a API de formulários
const Placeholder = () => (
  <div className="p-6 text-muted-foreground">Módulo de formulários em atualização.</div>
);

export const FormulariosPage: React.FC = () => {
  return (
    <div className="p-6">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:underline">Início</Link>
        <span> / </span>
        <span>Formulários</span>
      </nav>
      <div className="rounded-md border bg-background">
        <Placeholder />
      </div>
    </div>
  );
};
