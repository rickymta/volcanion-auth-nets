// Apply all mocks
jest.mock('../../src/config/database', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn()
  },
  redisClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    expire: jest.fn(),
    setEx: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hDel: jest.fn(),
    hExists: jest.fn(),
    isOpen: true,
    isReady: true,
  }
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn()
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK'
    }),
    verify: jest.fn().mockResolvedValue(true),
  })
}));
