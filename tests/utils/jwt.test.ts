import { JwtUtils } from '../../src/utils';
import { TokenPayload } from '../../src/types';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn()
}));

import jwt from 'jsonwebtoken';
const mockJWT = {
  sign: jwt.sign as jest.MockedFunction<any>,
  verify: jwt.verify as jest.MockedFunction<any>,
  decode: jwt.decode as jest.MockedFunction<any>
};

describe('JwtUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload: TokenPayload = {
        accountId: 1,
        email: 'test@example.com',
        permissions: ['read_account', 'update_account']
      };

      // Mock sign to return tokens
      mockJWT.sign.mockReturnValueOnce('mock-access-token');
      mockJWT.sign.mockReturnValueOnce('mock-refresh-token');

      const tokens = JwtUtils.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should call jwt.sign with correct parameters for access token', () => {
      const payload: TokenPayload = {
        accountId: 1,
        email: 'test@example.com',
        permissions: ['read_account']
      };

      JwtUtils.generateTokens(payload);

      expect(mockJWT.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_ACCESS_SECRET,
        expect.objectContaining({
          expiresIn: '15m',
          issuer: 'volcanion-auth',
          audience: 'volcanion-app'
        })
      );
    });

    it('should call jwt.sign with correct parameters for refresh token', () => {
      const payload: TokenPayload = {
        accountId: 1,
        email: 'test@example.com',
        permissions: ['read_account']
      };

      JwtUtils.generateTokens(payload);

      expect(mockJWT.sign).toHaveBeenCalledWith(
        { accountId: payload.accountId, email: payload.email },
        process.env.JWT_REFRESH_SECRET,
        expect.objectContaining({
          expiresIn: '7d',
          issuer: 'volcanion-auth',
          audience: 'volcanion-app'
        })
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = 'valid-access-token';
      const expectedPayload = {
        accountId: 1,
        email: 'test@example.com',
        permissions: ['read_account']
      };

      mockJWT.verify.mockReturnValue(expectedPayload);

      const result = JwtUtils.verifyAccessToken(token);

      expect(mockJWT.verify).toHaveBeenCalledWith(
        token, 
        process.env.JWT_ACCESS_SECRET,
        { issuer: 'volcanion-auth', audience: 'volcanion-app' }
      );
      expect(result).toEqual(expectedPayload);
    });

    it('should throw error for invalid access token', () => {
      const token = 'invalid-token';
      mockJWT.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => JwtUtils.verifyAccessToken(token)).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = 'valid-refresh-token';
      const expectedPayload = {
        accountId: 1,
        email: 'test@example.com'
      };

      mockJWT.verify.mockReturnValue(expectedPayload);

      const result = JwtUtils.verifyRefreshToken(token);

      expect(mockJWT.verify).toHaveBeenCalledWith(
        token, 
        process.env.JWT_REFRESH_SECRET,
        { issuer: 'volcanion-auth', audience: 'volcanion-app' }
      );
      expect(result).toEqual(expectedPayload);
    });

    it('should throw error for invalid refresh token', () => {
      const token = 'invalid-token';
      mockJWT.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => JwtUtils.verifyRefreshToken(token)).toThrow('Invalid token');
    });
  });

  describe('private methods test coverage', () => {
    it('should handle token expiration calculation', () => {
      // Test through generateTokens which calls private getTokenExpirationTime
      const payload: TokenPayload = {
        accountId: 1,
        email: 'test@example.com',
        permissions: ['read_account']
      };

      const tokens = JwtUtils.generateTokens(payload);
      
      // Should return a number for expiresIn (900 seconds for 15m default)
      expect(typeof tokens.expiresIn).toBe('number');
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });
  });
});
