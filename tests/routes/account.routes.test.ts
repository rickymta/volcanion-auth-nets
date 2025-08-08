// Mock dependencies
jest.mock('../../src/controllers');
jest.mock('../../src/middleware/validation', () => ({
  validate: jest.fn(() => (req: any, res: any, next: any) => next()),
  validationSchemas: {
    updateProfile: {},
    changePassword: {},
    uploadAvatar: {}
  }
}));
jest.mock('../../src/middleware/auth', () => ({
  AuthMiddleware: {
    authenticate: jest.fn((req: any, res: any, next: any) => next())
  }
}));
jest.mock('../../src/middleware/rateLimiter', () => ({
  apiLimiter: jest.fn((req: any, res: any, next: any) => next())
}));

import request from 'supertest';
import express from 'express';
import accountRoutes from '../../src/routes/accountRoutes';
import { AccountController } from '../../src/controllers';

describe('Account Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/account', accountRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock controller methods to return success responses
    (AccountController.getProfile as jest.Mock).mockImplementation((req: any, res: any) => {
      res.status(200).json({ success: true, data: { id: 1, email: 'test@example.com' } });
    });
    (AccountController.updateProfile as jest.Mock).mockImplementation((req: any, res: any) => {
      res.status(200).json({ success: true, message: 'Profile updated' });
    });
    (AccountController.changePassword as jest.Mock).mockImplementation((req: any, res: any) => {
      res.status(200).json({ success: true, message: 'Password changed' });
    });
    (AccountController.updateAvatar as jest.Mock).mockImplementation((req: any, res: any) => {
      res.status(200).json({ success: true, data: { avatarUrl: 'avatar.jpg' } });
    });
    (AccountController.deactivateAccount as jest.Mock).mockImplementation((req: any, res: any) => {
      res.status(200).json({ success: true, message: 'Account deactivated' });
    });
  });

  describe('Protected Routes', () => {
    describe('GET /account/profile', () => {
      it('should get user profile', async () => {
        const response = await request(app)
          .get('/account/profile')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(AccountController.getProfile).toHaveBeenCalled();
      });
    });

    describe('PUT /account/profile', () => {
      it('should update user profile', async () => {
        const response = await request(app)
          .put('/account/profile')
          .send({ first_name: 'John', last_name: 'Doe' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(AccountController.updateProfile).toHaveBeenCalled();
      });
    });

    describe('PUT /account/change-password', () => {
      it('should change user password', async () => {
        const response = await request(app)
          .put('/account/change-password')
          .send({
            currentPassword: 'oldPassword',
            newPassword: 'newPassword'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(AccountController.changePassword).toHaveBeenCalled();
      });
    });

    describe('POST /account/avatar', () => {
      it('should upload avatar', async () => {
        const response = await request(app)
          .post('/account/avatar')
          .attach('avatar', Buffer.from('fake-image'), 'avatar.jpg')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(AccountController.updateAvatar).toHaveBeenCalled();
      });
    });

    describe('DELETE /account/deactivate', () => {
      it('should deactivate account', async () => {
        const response = await request(app)
          .delete('/account/deactivate')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(AccountController.deactivateAccount).toHaveBeenCalled();
      });
    });
  });

  describe('Route Configuration', () => {
    it('should be defined', () => {
      expect(accountRoutes).toBeDefined();
    });

    it('should handle 404 for non-existent routes', async () => {
      await request(app)
        .get('/account/nonexistent')
        .expect(404);
    });
  });
});
