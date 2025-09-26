import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const EditarBeneficiaria: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a página de detalhes com o parâmetro edit=true
    if (id) {
      navigate(`/beneficiarias/${id}?edit=true`, { replace: true });
    }
  }, [id, navigate]);

  return null; // Este componente apenas redireciona
};

export default EditarBeneficiaria;
