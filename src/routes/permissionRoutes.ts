import { Router } from 'express';
import { PermissionController } from '../controllers';
import { validate, validationSchemas, customValidation } from '../middleware/validation';
import { AuthMiddleware } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(AuthMiddleware.authenticate);
router.use(apiLimiter);

/**
 * @swagger
 * /api/v1/permissions/roles:
 *   get:
 *     tags: [Permissions]
 *     summary: Get all roles (Admin only)
 *     description: Retrieves a list of all roles in the system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/roles',
  AuthMiddleware.requirePermission('role', 'read'),
  PermissionController.getAllRoles
);

/**
 * @swagger
 * /api/v1/permissions/roles/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get role by ID (Admin only)
 *     description: Retrieves a specific role by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Invalid role ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/roles/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('role', 'read'),
  PermissionController.getRoleById
);

/**
 * @swagger
 * /api/v1/permissions/roles:
 *   post:
 *     tags: [Permissions]
 *     summary: Create new role (Admin only)
 *     description: Creates a new role in the system
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleRequest'
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Role created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Role already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/roles',
  AuthMiddleware.requirePermission('role', 'create'),
  customValidation.sanitizeInput,
  validate(validationSchemas.createRole),
  PermissionController.createRole
);

router.put('/roles/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('role', 'update'),
  customValidation.sanitizeInput,
  validate(validationSchemas.updateRole),
  PermissionController.updateRole
);

router.delete('/roles/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('role', 'delete'),
  PermissionController.deleteRole
);

// Permission routes
router.get('/permissions',
  AuthMiddleware.requirePermission('permission', 'read'),
  PermissionController.getAllPermissions
);

router.get('/permissions/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('permission', 'read'),
  PermissionController.getPermissionById
);

router.post('/permissions',
  AuthMiddleware.requirePermission('permission', 'create'),
  customValidation.sanitizeInput,
  validate(validationSchemas.createPermission),
  PermissionController.createPermission
);

router.put('/permissions/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('permission', 'update'),
  customValidation.sanitizeInput,
  validate(validationSchemas.createPermission), // Reuse create schema for update
  PermissionController.updatePermission
);

router.delete('/permissions/:id',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('permission', 'delete'),
  PermissionController.deletePermission
);

// Role-Permission assignment routes
router.post('/roles/:roleId/permissions/:permissionId',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('role', 'update'),
  PermissionController.assignPermissionToRole
);

router.delete('/roles/:roleId/permissions/:permissionId',
  customValidation.isValidId,
  AuthMiddleware.requirePermission('role', 'update'),
  PermissionController.removePermissionFromRole
);

// Account permission management routes
router.post('/grant-role',
  AuthMiddleware.requirePermission('grant', 'create'),
  validate(validationSchemas.grantRole),
  PermissionController.grantRoleToAccount
);

router.post('/revoke-role',
  AuthMiddleware.requirePermission('grant', 'delete'),
  validate(validationSchemas.grantRole), // Reuse same schema
  PermissionController.revokeRoleFromAccount
);

router.post('/grant-permission',
  AuthMiddleware.requirePermission('grant', 'create'),
  validate(validationSchemas.grantPermission),
  PermissionController.grantPermissionToAccount
);

router.post('/revoke-permission',
  AuthMiddleware.requirePermission('grant', 'delete'),
  validate(validationSchemas.grantPermission), // Reuse same schema
  PermissionController.revokePermissionFromAccount
);

// Get account permissions
router.get('/accounts/:accountId/permissions',
  customValidation.isValidId,
  AuthMiddleware.requireOwnershipOrPermission('grant', 'read'),
  PermissionController.getAccountPermissions
);

// Check permission
router.get('/check',
  AuthMiddleware.requirePermission('grant', 'read'),
  PermissionController.checkPermission
);

export default router;
