const actualLoggerModule = jest.requireActual<typeof import('../logger')>('../logger');

const { errorWithStack, logger, loggerService, setContext } = actualLoggerModule;

describe('loggerService context handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setContext();
  });

  it('includes context metadata when logging info', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);

    setContext('ctx-123');
    loggerService.info('test message', { foo: 'bar' });

    expect(infoSpy).toHaveBeenCalledWith(
      'test message',
      expect.objectContaining({ foo: 'bar', context: 'ctx-123' })
    );
  });

  it('adds context metadata when none provided', () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);

    setContext('ctx-debug');
    loggerService.debug('debug message');

    expect(debugSpy).toHaveBeenCalledWith('debug message', { context: 'ctx-debug' });
  });

  it('clears context when setContext is called without value', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);

    setContext('ctx-warn');
    setContext();

    loggerService.warn('warn message');

    expect(warnSpy).toHaveBeenCalledWith('warn message');
  });

  it('logs error with stack and active context', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const error = new Error('boom');

    setContext('ctx-error');
    errorWithStack(error, 'custom error', { meta: 'value' });

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
});
