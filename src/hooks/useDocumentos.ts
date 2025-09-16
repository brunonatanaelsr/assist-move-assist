import { useState } from 'react';

// Hook de exemplo para testes
const useDocumentos = () => {
  const [docs] = useState([]);
  return { docs };
};

export default useDocumentos;
