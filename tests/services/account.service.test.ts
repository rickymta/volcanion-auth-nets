// Mock all dependencies first
jest.mock('../../src/utils');

import { AccountService } from '../../src/services/accountService';
import { PasswordUtils } from '../../src/utils';
import { pool } from '../../src/config/database';

// Type the mocks
const mockPool = pool as jest.Mocked<typeof pool>;
const mockPasswordUtils = PasswordUtils as jest.Mocked<typeof PasswordUtils>;

describe('AccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create account successfully with all fields', async () => {
      const accountData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        phone: '123456789',
        date_of_birth: '1990-01-01',
        gender: 'male' as const
      };

      mockPasswordUtils.hash.mockResolvedValue('hashedPassword');
      mockPool.execute.mockResolvedValue([{ insertId: 1 }] as any);

      const accountId = await AccountService.createAccount(accountData);

      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('password123');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO accounts'),
        ['test@example.com', 'hashedPassword', 'John', 'Doe', '123456789', '1990-01-01', 'male']
      );
      expect(accountId).toBe(1);
    });

    it('should create account with minimal fields', async () => {
      const accountData = {
        email: 'minimal@example.com',
        password: 'password123'
      };

      mockPasswordUtils.hash.mockResolvedValue('hashedPassword');
      mockPool.execute.mockResolvedValue([{ insertId: 2 }] as any);

      const accountId = await AccountService.createAccount(accountData);

      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('password123');
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO accounts'),
        ['minimal@example.com', 'hashedPassword', null, null, null, null, null]
      );
      expect(accountId).toBe(2);
    });

    it('should handle database error during creation', async () => {
      const accountData = {
        email: 'error@example.com',
        password: 'password123'
      };

      mockPasswordUtils.hash.mockResolvedValue('hashedPassword');
      mockPool.execute.mockRejectedValue(new Error('Database error'));

      await expect(AccountService.createAccount(accountData)).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find account by email', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        first_name: 'John',
        last_name: 'Doe',
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.execute.mockResolvedValue([[mockAccount]] as any);

      const result = await AccountService.findByEmail('test@example.com');

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE email = ? AND is_active = 1',
        ['test@example.com']
      );
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AccountService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find account by id', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        first_name: 'John',
        last_name: 'Doe',
        is_verified: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.execute.mockResolvedValue([[mockAccount]] as any);

      const result = await AccountService.findById(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = ? AND is_active = 1',
        [1]
      );
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AccountService.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateAccount', () => {
    it('should update account with all fields', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '987654321',
        date_of_birth: '1995-05-15',
        gender: 'female' as const
      };

      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.updateAccount(1, updateData);

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET first_name = ?, last_name = ?, phone = ?, date_of_birth = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
        ['Jane', 'Smith', '987654321', '1995-05-15', 'female', 1]
      );
      expect(result).toBe(true);
    });

    it('should return false when no fields to update', async () => {
      const updateData = {};

      const result = await AccountService.updateAccount(1, updateData);

      expect(result).toBe(false);
      expect(mockPool.execute).not.toHaveBeenCalled();
    });

    it('should update only some fields', async () => {
      const updateData = {
        first_name: 'UpdatedName'
      };

      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.updateAccount(1, updateData);

      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET first_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
        ['UpdatedName', 1]
      );
      expect(result).toBe(true);
    });

    it('should return false when account not found during update', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith'
      };

      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AccountService.updateAccount(999, updateData);

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockPasswordUtils.hash.mockResolvedValue('newHashedPassword');
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.updatePassword(1, 'newPassword123');

      expect(mockPasswordUtils.hash).toHaveBeenCalledWith('newPassword123');
      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE accounts SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['newHashedPassword', 1]
      );
      expect(result).toBe(true);
    });

    it('should return false when account not found', async () => {
      mockPasswordUtils.hash.mockResolvedValue('newHashedPassword');
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AccountService.updatePassword(999, 'newPassword123');

      expect(result).toBe(false);
    });
  });

  describe('verifyAccount', () => {
    it('should verify account successfully', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.verifyAccount(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE accounts SET is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false when account not found', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AccountService.verifyAccount(999);

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockPool.execute.mockResolvedValue([{}] as any);

      await AccountService.updateLastLogin(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [1]
      );
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar URL successfully', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.updateAvatar(1, 'https://example.com/avatar.jpg');

      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE accounts SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['https://example.com/avatar.jpg', 1]
      );
      expect(result).toBe(true);
    });

    it('should return false when account not found', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AccountService.updateAvatar(999, 'https://example.com/avatar.jpg');

      expect(result).toBe(false);
    });
  });

  describe('getAccountWithPermissions', () => {
    it('should get account with permissions and roles', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '123456789',
        date_of_birth: '1990-01-01',
        gender: 'male',
        avatar_url: 'https://example.com/avatar.jpg',
        is_verified: true,
        is_active: true,
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockPermissions = [
        { permission_name: 'read_users', role_name: 'admin' },
        { permission_name: 'write_users', role_name: 'admin' },
        { permission_name: 'read_posts', role_name: 'user' },
        { permission_name: 'read_users', role_name: 'user' } // Duplicate permission
      ];

      mockPool.execute
        .mockResolvedValueOnce([[mockAccount]] as any) // Account query
        .mockResolvedValueOnce([mockPermissions] as any); // Permissions query

      const result = await AccountService.getAccountWithPermissions(1);

      expect(mockPool.execute).toHaveBeenCalledTimes(2);
      expect(mockPool.execute).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT id, email, first_name'),
        [1]
      );
      expect(mockPool.execute).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SELECT DISTINCT p.name as permission_name'),
        [1]
      );

      expect(result).toEqual({
        ...mockAccount,
        permissions: ['read_users', 'write_users', 'read_posts'],
        roles: ['admin', 'user']
      });
    });

    it('should return null when account not found', async () => {
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AccountService.getAccountWithPermissions(999);

      expect(result).toBeNull();
    });

    it('should return account with empty permissions when no permissions found', async () => {
      const mockAccount = {
        id: 1,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: null,
        date_of_birth: null,
        gender: null,
        avatar_url: null,
        is_verified: false,
        is_active: true,
        last_login: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.execute
        .mockResolvedValueOnce([[mockAccount]] as any) // Account query
        .mockResolvedValueOnce([[], []] as any); // Empty permissions

      const result = await AccountService.getAccountWithPermissions(1);

      expect(result).toEqual({
        ...mockAccount,
        permissions: [],
        roles: []
      });
    });
  });

  describe('getAllAccounts', () => {
    it('should get all accounts with pagination', async () => {
      const mockAccounts = [
        {
          id: 1,
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '123456789',
          date_of_birth: '1990-01-01',
          gender: 'male',
          avatar_url: null,
          is_verified: true,
          is_active: true,
          last_login: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          email: 'user2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '987654321',
          date_of_birth: '1995-05-15',
          gender: 'female',
          avatar_url: 'https://example.com/avatar2.jpg',
          is_verified: false,
          is_active: true,
          last_login: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.execute
        .mockResolvedValueOnce([[{ total: 25 }]] as any) // Count query
        .mockResolvedValueOnce([mockAccounts] as any); // Accounts query

      const result = await AccountService.getAllAccounts(2, 10);

      expect(mockPool.execute).toHaveBeenCalledTimes(2);
      expect(mockPool.execute).toHaveBeenNthCalledWith(1,
        'SELECT COUNT(*) as total FROM accounts WHERE is_active = 1'
      );
      expect(mockPool.execute).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SELECT id, email, first_name'),
        [10, 10] // limit, offset
      );

      expect(result).toEqual({
        accounts: mockAccounts,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3
      });
    });

    it('should use default pagination values', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[{ total: 5 }]] as any)
        .mockResolvedValueOnce([[], []] as any);

      const result = await AccountService.getAllAccounts();

      expect(mockPool.execute).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [10, 0] // default limit, offset for page 1
      );

      expect(result).toEqual({
        accounts: [],
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle zero accounts', async () => {
      mockPool.execute
        .mockResolvedValueOnce([[{ total: 0 }]] as any)
        .mockResolvedValueOnce([[], []] as any);

      const result = await AccountService.getAllAccounts(1, 5);

      expect(result).toEqual({
        accounts: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0
      });
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 1 }] as any);

      const result = await AccountService.deactivateAccount(1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false when account not found', async () => {
      mockPool.execute.mockResolvedValue([{ affectedRows: 0 }] as any);

      const result = await AccountService.deactivateAccount(999);

      expect(result).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockPool.execute.mockResolvedValue([[{ id: 1 }]] as any);

      const result = await AccountService.emailExists('existing@example.com');

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT id FROM accounts WHERE email = ? AND is_active = 1',
        ['existing@example.com']
      );
      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AccountService.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should exclude specific id when checking', async () => {
      mockPool.execute.mockResolvedValue([[]] as any);

      const result = await AccountService.emailExists('test@example.com', 1);

      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT id FROM accounts WHERE email = ? AND is_active = 1 AND id != ?',
        ['test@example.com', 1]
      );
      expect(result).toBe(false);
    });
  });
});
