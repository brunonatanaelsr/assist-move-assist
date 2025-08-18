export interface PaediBeneficiaria {
  id: number;
  nome_completo: string;
  cpf: string;
  data_criacao?: string;
  data_cadastro?: string;
  [key: string]: any; // para outros campos que possam existir
}

/**
 * Gera o código PAEDI (Prontuário de Acompanhamento e Evolução de Desenvolvimento Individual)
 * para uma beneficiária baseado em seu ID e data de cadastro/criação
 * 
 * @param beneficiaria A beneficiária para gerar o PAEDI. Precisa ter id e data_cadastro/data_criacao
 * @returns O código PAEDI no formato AAMMXXX onde:
 *   - AA são os dois últimos dígitos do ano
 *   - MM é o mês com dois dígitos
 *   - XXX são os últimos 3 dígitos do ID da beneficiária
 */
export const generatePAEDI = (beneficiaria: PaediBeneficiaria | null | undefined) => {
  if (!beneficiaria || !beneficiaria.id) return 'N/A';
  
  try {
    const dataCriacao = new Date(beneficiaria.data_cadastro || beneficiaria.data_criacao || new Date());
    if (isNaN(dataCriacao.getTime())) return 'N/A';
    
    const ano = dataCriacao.getFullYear().toString().slice(-2);
    const mes = (dataCriacao.getMonth() + 1).toString().padStart(2, '0');
    const sequence = beneficiaria.id.toString().padStart(3, '0').slice(-3);
    return `${ano}${mes}${sequence}`;
  } catch (err) {
    console.error('Erro ao gerar PAEDI:', err);
    return 'N/A';
  }
};
