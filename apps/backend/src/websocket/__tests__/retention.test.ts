const retentionConfig = { ttlSeconds: 86400, maxItems: 200 };

jest.mock('../../config', () => ({
  config: {
    redis: {
      unreadRetention: retentionConfig,
    },
  },
}));

jest.mock('../../lib/redis', () => ({
  redis: {
    expire: jest.fn(),
    ltrim: jest.fn(),
  },
}));

const { redis } = require('../../lib/redis');
const { applyUnreadRetention } = require('../retention');

const expireMock = redis.expire as jest.Mock;
const ltrimMock = redis.ltrim as jest.Mock;

describe('applyUnreadRetention', () => {
  beforeEach(() => {
    expireMock.mockReset();
    expireMock.mockResolvedValue(1);
    ltrimMock.mockReset();
    ltrimMock.mockResolvedValue('OK');
    retentionConfig.ttlSeconds = 86400;
    retentionConfig.maxItems = 200;
  });

  it('applies expire and ltrim with configured retention', async () => {
    await applyUnreadRetention('chat:unread:1');

    expect(redis.ltrim).toHaveBeenCalledWith('chat:unread:1', 0, 199);
    expect(redis.expire).toHaveBeenCalledWith('chat:unread:1', 86400);
  });

  it('skips operations when retention values are disabled', async () => {
    retentionConfig.ttlSeconds = 0;
    retentionConfig.maxItems = 0;

    await applyUnreadRetention('chat:unread:2');

    expect(redis.ltrim).not.toHaveBeenCalled();
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('permits overriding retention per call', async () => {
    await applyUnreadRetention('chat:unread:3', { ttlSeconds: 120, maxItems: 10 });

    expect(redis.ltrim).toHaveBeenCalledWith('chat:unread:3', 0, 9);
    expect(redis.expire).toHaveBeenCalledWith('chat:unread:3', 120);
  });
});
