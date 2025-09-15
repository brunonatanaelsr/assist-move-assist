import { apiService } from '@/services/apiService';

export const api = {
  dashboard: {
    getRecentActivities: async (limit = 20) => {
      const res = await apiService.getDashboardActivities();
      const activities = (res.success && Array.isArray(res.data)) ? (res.data as any[]) : [];
      return { activities: activities.slice(0, limit) };
    }
  }
};

export default api;

