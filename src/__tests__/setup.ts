import '@testing-library/jest-dom';
import { unstable_setRouterFutureFlags } from 'react-router-dom';

if (typeof unstable_setRouterFutureFlags === 'function') {
  unstable_setRouterFutureFlags({
    v7_startTransition: true,
    v7_relativeSplatPath: true
  });
}
