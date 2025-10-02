const actualLoggerModule = jest.requireActual<typeof import('../logger')>('../logger');

const {
  logger,
  loggerContextMiddleware,
  loggerService,
  setContext,
} = actualLoggerModule;

const runMiddleware = (next: () => void | Promise<void>) =>
  new Promise<void>((resolve, reject) => {
    try {
      loggerContextMiddleware({}, {}, () => {
        Promise.resolve()
          .then(next)
          .then(() => resolve())
          .catch(reject);
      });
    } catch (error) {
      reject(error);
    }
  });

describe('loggerContextMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an isolated context per request', async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);

    await runMiddleware(async () => {
      setContext('request-a');
      await new Promise((resolve) => setImmediate(resolve));
      loggerService.info('from request a');
    });

    await runMiddleware(() => {
      loggerService.info('from request b');
    });

    expect(infoSpy).toHaveBeenNthCalledWith(1, 'from request a', {
      context: 'request-a',
    });
    expect(infoSpy).toHaveBeenNthCalledWith(2, 'from request b');
  });

  it('propagates context through async operations created within the middleware scope', async () => {
    const debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);

    await runMiddleware(async () => {
      setContext('async-request');

      const payload = await new Promise((resolve) => {
        setTimeout(() => resolve({ value: 42 }), 0);
      });

      loggerService.debug('async payload', payload);
    });

    expect(debugSpy).toHaveBeenCalledWith('async payload', {
      value: 42,
      context: 'async-request',
    });
  });
});
