const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
    login,
    register,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    verifyToken
} = require('../controllers/authController');

const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, secretary, patient]
 *         phone:
 *           type: string
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido requerido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres')
], login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario (solo admin)
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.post('/register', [
    authenticateToken,
    requireAdmin,
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido requerido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido debe tener entre 2 y 100 caracteres'),
    body('role')
        .optional()
        .isIn(['admin', 'secretary', 'patient'])
        .withMessage('Rol debe ser admin, secretary o patient'),
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono inválido')
], register);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *       401:
 *         description: Refresh token inválido
 */
router.post('/refresh', [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token requerido')
], refreshToken);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *       401:
 *         description: Token inválido
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 */
router.put('/profile', [
    authenticateToken,
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido debe tener entre 2 y 100 caracteres'),
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono inválido')
], updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 */
router.put('/change-password', [
    authenticateToken,
    body('currentPassword')
        .notEmpty()
        .withMessage('Contraseña actual requerida'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Nueva contraseña debe tener al menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Nueva contraseña debe contener al menos una mayúscula, una minúscula y un número')
], changePassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar validez del token
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *       401:
 *         description: Token inválido
 */
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;