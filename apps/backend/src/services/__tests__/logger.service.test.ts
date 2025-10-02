const actualLoggerModule = jest.requireActual<typeof import('../logger')>('../logger');

const {
  errorWithStack,
  logger,
  loggerService,
  runWithLoggerContext,
  setContext,
} = actualLoggerModule;

describe('loggerService context handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes context metadata when logging info', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);

    runWithLoggerContext(() => {
      setContext('ctx-123');
      loggerService.info('test message', { foo: 'bar' });
    });

    expect(infoSpy).toHaveBeenCalledWith(
      'test message',
      expect.objectContaining({ foo: 'bar', context: 'ctx-123' })
    );
  });

  it('adds context metadata when none provided', () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);

    runWithLoggerContext(() => {
      setContext('ctx-debug');
      loggerService.debug('debug message');
    });

    expect(debugSpy).toHaveBeenCalledWith('debug message', { context: 'ctx-debug' });
  });

  it('clears context when setContext is called without value', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);

    runWithLoggerContext(() => {
      setContext('ctx-warn');
      setContext();

      loggerService.warn('warn message');
    });

    expect(warnSpy).toHaveBeenCalledWith('warn message');
  });

  it('logs error with stack and active context', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const error = new Error('boom');

    runWithLoggerContext(() => {
      setContext('ctx-error');
      errorWithStack(error, 'custom error', { meta: 'value' });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'custom error',
      expect.objectContaining({
        meta: 'value',
        errorMessage: 'boom',
        stack: error.stack,
        context: 'ctx-error'
      })
    );
  });

  it('throws when attempting to set context without initialized storage', () => {
    expect(() => setContext('ctx-uninitialized')).toThrow(
      /Logger context storage was not initialized/
    );
  });

  it('persists context across asynchronous operations started inside the request scope', async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);

    await runWithLoggerContext(async () => {
      setContext('async-ctx');

      await new Promise((resolve) => setImmediate(resolve));

      loggerService.info('async message');
    });

    expect(infoSpy).toHaveBeenCalledWith('async message', { context: 'async-ctx' });
  });
});
