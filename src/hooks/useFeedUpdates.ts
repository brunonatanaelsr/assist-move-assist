import { useState } from 'react';

// Hook de exemplo para testes
const useFeedUpdates = () => {
  const [updates] = useState([]);
  return { updates };
};

export default useFeedUpdates;
