import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDashboardStats,
  getRecentActivities,
  getActivitiesAlias,
  getDashboardTasks,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getQuickAccessLinks
} from '../controllers/dashboard.controller';
import { catchAsync } from '../middleware/errorHandler';

const router = express.Router();

router.get('/stats', authenticateToken, catchAsync(getDashboardStats));
router.get('/recent-activities', authenticateToken, catchAsync(getRecentActivities));
router.get('/activities', authenticateToken, catchAsync(getActivitiesAlias));
router.get('/tasks', authenticateToken, catchAsync(getDashboardTasks));
router.get('/notifications', authenticateToken, catchAsync(getNotifications));
router.put('/notifications/:id/read', authenticateToken, catchAsync(markNotificationAsRead));
router.post('/notifications/mark-all-read', authenticateToken, catchAsync(markAllNotificationsAsRead));
router.get('/quick-access', authenticateToken, catchAsync(getQuickAccessLinks));

export default router;
