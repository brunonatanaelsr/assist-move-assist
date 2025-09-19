export interface DashboardStatsResponse {
  totalBeneficiarias: number;
  activeBeneficiarias: number;
  inactiveBeneficiarias: number;
  totalFormularios: number;
  totalAtendimentos: number;
  totalAnamneses: number;
  totalDeclaracoes: number;
  engajamento: number;
  monthlyRegistrations?: Array<{
    month: string;
    count: number | string;
  }>;
  statusDistribution?: Array<{
    status: string | null;
    count: number | string;
  }>;
}
