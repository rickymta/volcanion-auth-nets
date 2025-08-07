import { PasswordUtils } from '../../src/utils';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

import bcrypt from 'bcryptjs';
const mockHash = bcrypt.hash as jest.MockedFunction<any>;
const mockCompare = bcrypt.compare as jest.MockedFunction<any>;

describe('PasswordUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with salt rounds', async () => {
      const password = 'testPassword123';
      const expectedHash = `hashed_${password}`;
      
      mockHash.mockResolvedValue(expectedHash);
      
      const hashedPassword = await PasswordUtils.hash(password);

      expect(mockHash).toHaveBeenCalledWith(password, 12);
      expect(hashedPassword).toBe(expectedHash);
    });

    it('should handle empty password', async () => {
      const password = '';
      const expectedHash = 'hashed_';
      
      mockHash.mockResolvedValue(expectedHash);
      
      const hashedPassword = await PasswordUtils.hash(password);

      expect(mockHash).toHaveBeenCalledWith(password, 12);
      expect(hashedPassword).toBe(expectedHash);
    });
  });

  describe('compare', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed_testPassword123';
      
      mockCompare.mockResolvedValue(true);

      const result = await PasswordUtils.compare(password, hashedPassword);

      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed_differentPassword';
      
      mockCompare.mockResolvedValue(false);

      const result = await PasswordUtils.compare(password, hashedPassword);

      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hashedPassword = 'hashed_';
      
      mockCompare.mockResolvedValue(true);

      const result = await PasswordUtils.compare(password, hashedPassword);

      expect(result).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a secure token', () => {
      const token = PasswordUtils.generateSecureToken();
      
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(64); // 32 bytes * 2 (hex)
    });

    it('should generate different tokens on multiple calls', () => {
      const token1 = PasswordUtils.generateSecureToken();
      const token2 = PasswordUtils.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token using SHA256', () => {
      const token = 'test-token';
      const hashedToken = PasswordUtils.hashToken(token);
      
      expect(typeof hashedToken).toBe('string');
      expect(hashedToken).toHaveLength(64); // SHA256 hex output
    });

    it('should produce consistent hash for same token', () => {
      const token = 'test-token';
      const hash1 = PasswordUtils.hashToken(token);
      const hash2 = PasswordUtils.hashToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      const hash1 = PasswordUtils.hashToken(token1);
      const hash2 = PasswordUtils.hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
