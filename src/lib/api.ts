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
      const activities = (res.success && Array.isArray(res.data)) ? (res.data as DashboardActivity[]) : [];
      return { activities: activities.slice(0, limit) };
    }
  }
};

export default api;

