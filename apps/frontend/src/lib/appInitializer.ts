import { logger } from './logger';

// Sistema de inicialização da aplicação para produção
class AppInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Inicializando aplicação', {
        page: 'app_init',
        action: 'initialize'
      });

      // Inicializar gerenciador de sessão
      // SessionManager é inicializado automaticamente

      // Configurar listeners de erro global
      this.setupGlobalErrorHandlers();

      // Configurar monitoramento de performance
      this.setupPerformanceMonitoring();

      this.initialized = true;
      
      logger.info('Aplicação inicializada com sucesso', {
        page: 'app_init',
        action: 'initialized'
      });

    } catch (error) {
      logger.error('Erro ao inicializar aplicação', error, {
        page: 'app_init',
        action: 'initialization_error'
      });
      throw error;
    }
  }

  private static setupGlobalErrorHandlers(): void {
    // Capturar erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      logger.error('Erro JavaScript não tratado', event.error, {
        page: window.location.pathname,
        action: 'unhandled_js_error',
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Capturar promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Promise rejeitada não tratada', event.reason, {
        page: window.location.pathname,
        action: 'unhandled_promise_rejection',
        url: window.location.href
      });
    });
  }

  private static setupPerformanceMonitoring(): void {
    // Monitorar tempo de carregamento da página
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        
        logger.info('Performance da página', {
          page: window.location.pathname,
          action: 'page_load_performance',
          url: window.location.href
        });

        // Log de performance apenas se for muito lento (>3s)
        if (loadTime > 3000) {
          logger.warn('Página carregou lentamente', {
            page: window.location.pathname,
            action: 'slow_page_load'
          });
        }
      }
    });

    // Monitorar mudanças de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      const action = document.hidden ? 'page_hidden' : 'page_visible';
      logger.info(`Página ${document.hidden ? 'oculta' : 'visível'}`, {
        page: window.location.pathname,
        action
      });
    });
  }

  static getInitializationStatus(): boolean {
    return this.initialized;
  }
}

export { AppInitializer };
