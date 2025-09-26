export { AppError } from './AppError';
export {
  BaseError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from './errors';

// Re-export middleware helpers for a single import surface
export { errorHandler, catchAsync } from '../middleware/errorHandler';

