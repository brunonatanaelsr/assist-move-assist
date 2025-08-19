import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { FormulariosPage } from '../pages/FormulariosPage';
import { FormularioDetalhesPage } from '../pages/FormularioDetalhesPage';
import { FormularioNovoPage } from '../pages/FormularioNovoPage';

export const FormulariosRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/formularios" element={<FormulariosPage />} />
      <Route path="/formularios/novo" element={<FormularioNovoPage />} />
      <Route path="/formularios/:tipo/:id" element={<FormularioDetalhesPage />} />
    </Routes>
  );
};
