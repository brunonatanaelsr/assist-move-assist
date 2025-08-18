import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackProps {
  type: FeedbackType;
  title?: string;
  message: string;
  className?: string;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
};

export const Feedback: React.FC<FeedbackProps> = ({ type, title, message, className = '' }) => {
  const Icon = icons[type];

  return (
    <Alert className={`${styles[type]} ${className}`}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

export const useFeedback = () => {
  const [feedback, setFeedback] = React.useState<{
    show: boolean;
    type: FeedbackType;
    title?: string;
    message: string;
  } | null>(null);

  const showFeedback = (type: FeedbackType, message: string, title?: string) => {
    setFeedback({ show: true, type, message, title });
  };

  const clearFeedback = () => {
    setFeedback(null);
  };

  return {
    feedback,
    showFeedback,
    clearFeedback,
    showSuccess: (message: string, title?: string) => showFeedback('success', message, title),
    showError: (message: string, title?: string) => showFeedback('error', message, title),
    showInfo: (message: string, title?: string) => showFeedback('info', message, title),
    showWarning: (message: string, title?: string) => showFeedback('warning', message, title)
  };
};
