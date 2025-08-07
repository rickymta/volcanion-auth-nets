import { Router } from 'express';
import authRoutes from './authRoutes';
import accountRoutes from './accountRoutes';
import permissionRoutes from './permissionRoutes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/permissions', permissionRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
