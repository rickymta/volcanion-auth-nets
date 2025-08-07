// Mock MySQL connection
export const mockConnection = {
  execute: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
};

export const mockPool = {
  execute: jest.fn(),
  getConnection: jest.fn().mockResolvedValue(mockConnection),
  end: jest.fn()
};

export const mockMySQLConnection = {
  createConnection: jest.fn().mockResolvedValue(mockConnection),
};

// Mock Redis client
export const mockRedisClient = {
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
};

export const mockRedis = {
  createClient: jest.fn().mockReturnValue(mockRedisClient),
};

// Mock nodemailer
export const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({
    messageId: 'test-message-id',
    response: '250 OK'
  }),
  verify: jest.fn().mockResolvedValue(true),
};

export const mockNodemailer = {
  createTransporter: jest.fn().mockReturnValue(mockTransporter),
};

// Mock bcryptjs
export const mockBcrypt = {
  hash: jest.fn().mockImplementation((password: string) => 
    Promise.resolve(`hashed_${password}`)
  ),
  compare: jest.fn().mockImplementation((password: string, hash: string) => 
    Promise.resolve(hash === `hashed_${password}`)
  ),
  genSalt: jest.fn().mockResolvedValue('salt'),
};

// Mock jsonwebtoken
export const mockJWT = {
  sign: jest.fn().mockImplementation((payload: any, secret: string, options?: any) => {
    return `jwt_token_${JSON.stringify(payload)}`;
  }),
  verify: jest.fn().mockImplementation((token: string, secret: string) => {
    if (token.startsWith('jwt_token_')) {
      const payload = token.replace('jwt_token_', '');
      return JSON.parse(payload);
    }
    throw new Error('Invalid token');
  }),
  decode: jest.fn().mockImplementation((token: string) => {
    if (token.startsWith('jwt_token_')) {
      const payload = token.replace('jwt_token_', '');
      return JSON.parse(payload);
    }
    return null;
  }),
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockConnection.execute.mockClear();
  mockConnection.query.mockClear();
  mockRedisClient.get.mockClear();
  mockRedisClient.set.mockClear();
  mockTransporter.sendMail.mockClear();
  mockBcrypt.hash.mockClear();
  mockBcrypt.compare.mockClear();
  mockJWT.sign.mockClear();
  mockJWT.verify.mockClear();
};
