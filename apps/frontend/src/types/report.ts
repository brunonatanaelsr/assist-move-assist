export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface FilterParams {
  date_range?: DateRange;
  status?: string[];
  category?: string[];
  region?: string[];
  project_id?: number[];
  form_id?: number[];
}

export interface DashboardMetrics {
  total_beneficiarias: number;
  active_beneficiarias: number;
  total_projects: number;
  active_projects: number;
  total_activities: number;
  completed_activities: number;
  total_forms: number;
  total_responses: number;
  engagement_rate: number;
  avg_satisfaction: number;
}

export interface ProjectMetrics {
  project_id: number;
  total_participants: number;
  active_participants: number;
  total_activities: number;
  completed_activities: number;
  engagement_rate: number;
  attendance_rate: number;
  satisfaction_score: number;
}

export interface FormMetrics {
  form_id: number;
  total_responses: number;
  completion_rate: number;
  avg_time_to_complete: number;
  response_rate_by_question: Record<string, number>;
  abandonment_rate: number;
}

export interface RegionalMetrics {
  region: string;
  total_beneficiarias: number;
  active_projects: number;
  engagement_rate: number;
  impact_score: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }>;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description?: string;
  type: 'dashboard' | 'project' | 'form' | 'regional';
  filters: FilterParams;
  metrics: string[];
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    description?: string;
    data_source: string;
    options?: any;
  }>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;
    day?: number;
    recipients: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface ExportFormat {
  type: 'pdf' | 'xlsx' | 'csv';
  options?: {
    include_charts?: boolean;
    include_raw_data?: boolean;
    chart_theme?: 'light' | 'dark';
  };
}
