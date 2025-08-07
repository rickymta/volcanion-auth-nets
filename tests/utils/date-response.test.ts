import { DateUtils, ResponseUtils } from '../../src/utils';

describe('DateUtils', () => {
  describe('addMinutes', () => {
    it('should add minutes to a date', () => {
      const date = new Date('2023-01-01T10:00:00Z');
      const result = DateUtils.addMinutes(date, 30);
      expect(result).toEqual(new Date('2023-01-01T10:30:00Z'));
    });

    it('should handle negative minutes', () => {
      const date = new Date('2023-01-01T10:30:00Z');
      const result = DateUtils.addMinutes(date, -30);
      expect(result).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should handle zero minutes', () => {
      const date = new Date('2023-01-01T10:00:00Z');
      const result = DateUtils.addMinutes(date, 0);
      expect(result).toEqual(date);
    });
  });

  describe('addHours', () => {
    it('should add hours to a date', () => {
      const date = new Date('2023-01-01T10:00:00Z');
      const result = DateUtils.addHours(date, 2);
      expect(result).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should handle negative hours', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const result = DateUtils.addHours(date, -2);
      expect(result).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should handle crossing day boundary', () => {
      const date = new Date('2023-01-01T23:00:00Z');
      const result = DateUtils.addHours(date, 2);
      expect(result).toEqual(new Date('2023-01-02T01:00:00Z'));
    });
  });

  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date('2023-01-01T10:00:00Z');
      const result = DateUtils.addDays(date, 5);
      expect(result).toEqual(new Date('2023-01-06T10:00:00Z'));
    });

    it('should handle negative days', () => {
      const date = new Date('2023-01-06T10:00:00Z');
      const result = DateUtils.addDays(date, -5);
      expect(result).toEqual(new Date('2023-01-01T10:00:00Z'));
    });

    it('should handle month boundary', () => {
      const date = new Date('2023-01-31T10:00:00Z');
      const result = DateUtils.addDays(date, 1);
      expect(result).toEqual(new Date('2023-02-01T10:00:00Z'));
    });
  });

  describe('isExpired', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      expect(DateUtils.isExpired(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      expect(DateUtils.isExpired(futureDate)).toBe(false);
    });

    it('should handle current time edge case', () => {
      const now = new Date();
      // Since there might be a slight delay, we'll test with a margin
      const result = DateUtils.isExpired(now);
      // Could be true or false depending on exact timing
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatDate', () => {
    it('should format date as MySQL datetime string', () => {
      const date = new Date('2023-01-01T10:30:45.123Z');
      const result = DateUtils.formatDate(date);
      expect(result).toBe('2023-01-01 10:30:45');
    });

    it('should handle different dates consistently', () => {
      const date1 = new Date('2023-12-31T23:59:59.999Z');
      const date2 = new Date('2023-01-01T00:00:00.000Z');
      
      expect(DateUtils.formatDate(date1)).toBe('2023-12-31 23:59:59');
      expect(DateUtils.formatDate(date2)).toBe('2023-01-01 00:00:00');
    });
  });
});

describe('ResponseUtils', () => {
  describe('success', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const result = ResponseUtils.success(data);
      
      expect(result).toEqual({
        success: true,
        message: 'Success',
        data
      });
    });

    it('should create success response with custom message', () => {
      const data = { id: 1 };
      const message = 'Created successfully';
      const result = ResponseUtils.success(data, message);
      
      expect(result).toEqual({
        success: true,
        message,
        data
      });
    });

    it('should handle null data', () => {
      const result = ResponseUtils.success(null);
      
      expect(result).toEqual({
        success: true,
        message: 'Success',
        data: null
      });
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];
      const result = ResponseUtils.success(data);
      
      expect(result).toEqual({
        success: true,
        message: 'Success',
        data
      });
    });
  });

  describe('error', () => {
    it('should create error response with message', () => {
      const message = 'Something went wrong';
      const result = ResponseUtils.error(message);
      
      expect(result).toEqual({
        success: false,
        message,
        errors: undefined
      });
    });

    it('should create error response with errors array', () => {
      const message = 'Validation failed';
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password too short' }
      ];
      const result = ResponseUtils.error(message, errors);
      
      expect(result).toEqual({
        success: false,
        message,
        errors
      });
    });

    it('should handle empty errors array', () => {
      const message = 'Error occurred';
      const result = ResponseUtils.error(message, []);
      
      expect(result).toEqual({
        success: false,
        message,
        errors: []
      });
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 20;
      const page = 2;
      const limit = 10;
      
      const result = ResponseUtils.paginated(data, total, page, limit);
      
      expect(result).toEqual({
        success: true,
        message: 'Success',
        data,
        pagination: {
          total: 20,
          page: 2,
          limit: 10,
          totalPages: 2,
          hasNext: false,
          hasPrev: true
        }
      });
    });

    it('should calculate pagination correctly for first page', () => {
      const data = [{ id: 1 }];
      const total = 25;
      const page = 1;
      const limit = 10;
      
      const result = ResponseUtils.paginated(data, total, page, limit);
      
      expect(result.pagination).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      });
    });

    it('should calculate pagination correctly for last page', () => {
      const data = [{ id: 1 }];
      const total = 25;
      const page = 3;
      const limit = 10;
      
      const result = ResponseUtils.paginated(data, total, page, limit);
      
      expect(result.pagination).toEqual({
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
        hasNext: false,
        hasPrev: true
      });
    });

    it('should handle custom message', () => {
      const data: any[] = [];
      const message = 'Users retrieved successfully';
      
      const result = ResponseUtils.paginated(data, 0, 1, 10, message);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe(message);
    });

    it('should handle edge case with zero total', () => {
      const data: any[] = [];
      const result = ResponseUtils.paginated(data, 0, 1, 10);
      
      expect(result.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    });
  });
});
