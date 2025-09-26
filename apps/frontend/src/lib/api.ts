import { apiService } from '@/services/apiService';

interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface DashboardResponse {
  activities: DashboardActivity[];
}

export const api = {
  dashboard: {
    getRecentActivities: async (limit = 20): Promise<DashboardResponse> => {
      const res = await apiService.getDashboardActivities();
      const normalized = res.success ? res.data ?? [] : [];
      const activities = Array.isArray(normalized) ? normalized as DashboardActivity[] : [];
      return { activities: activities.slice(0, limit) };
    }
  }
};

export default api;

