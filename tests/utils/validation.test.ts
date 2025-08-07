import { ValidationUtils } from '../../src/utils';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user_name@example-domain.com',
        'a@b.co',
        'very.long.email.address@very.long.domain.name.com'
      ];

      validEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com',
        'invalid.email',
        'invalid@',
        'invalid@domain',
        'invalid@domain.',
        'invalid @example.com',
        'invalid@example .com',
        'invalid@exa mple.com'
      ];

      invalidEmails.forEach(email => {
        expect(ValidationUtils.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidPhone', () => {
    it('should return true for valid Vietnamese phone numbers', () => {
      const validPhones = [
        '0987654321',
        '0387654321',
        '0587654321',
        '0787654321',
        '0987654321',
        '0356789012',
        '0789123456',
        '0567890123',
        '0834567890',
        '0945678901',
        '+84987654321',
        '84987654321'
      ];

      validPhones.forEach(phone => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(true);
      });
    });

    it('should return false for invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123456789',    // too short
        '12345678901',  // too long
        '1987654321',   // doesn't start with 0/84/+84
        '0187654321',   // invalid prefix
        '0987 654 321', // contains spaces
        '0987-654-321', // contains dashes
        'abc0987654321', // contains letters
        '0987654321a',   // ends with letter
        '0287654321'     // invalid second digit
      ];

      invalidPhones.forEach(phone => {
        expect(ValidationUtils.isValidPhone(phone)).toBe(false);
      });
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid passwords', () => {
      const validPasswords = [
        'password1',
        'Password1',
        'MyPassw0rd',
        'Test123456',
        'Valid@Pass1',
        'Str0ng#P@ssw0rd'
      ];

      validPasswords.forEach(password => {
        expect(ValidationUtils.isValidPassword(password)).toBe(true);
      });
    });

    it('should return false for invalid passwords', () => {
      const invalidPasswords = [
        '',              // empty
        'short',         // too short
        'password',      // no numbers
        '12345678',      // no letters
        'Pass123'        // less than 8 chars
      ];

      invalidPasswords.forEach(password => {
        expect(ValidationUtils.isValidPassword(password)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace and remove dangerous characters', () => {
      const input = '  <script>alert("xss")</script>  ';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('');
    });

    it('should handle string with only whitespace', () => {
      const input = '   ';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('');
    });

    it('should preserve safe content', () => {
      const input = '  Hello World  ';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should remove angle brackets', () => {
      const input = 'Hello <> World';
      const result = ValidationUtils.sanitizeString(input);
      expect(result).toBe('Hello  World');
    });
  });
});
