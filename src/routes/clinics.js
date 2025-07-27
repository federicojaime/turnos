const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
    getAllClinics,
    getClinicById,
    createClinic,
    updateClinic,
    deleteClinic,
    getClinicStats,
    getCities
} = require('../controllers/clinicController');

const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Clinic:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - city
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la clínica
 *         name:
 *           type: string
 *           description: Nombre de la clínica
 *         address:
 *           type: string
 *           description: Dirección completa
 *         phone:
 *           type: string
 *           description: Teléfono de contacto
 *         email:
 *           type: string
 *           format: email
 *           description: Email de contacto
 *         city:
 *           type: string
 *           description: Ciudad donde se ubica
 *         state:
 *           type: string
 *           description: Provincia/Estado
 *         postalCode:
 *           type: string
 *           description: Código postal
 *         openingHours:
 *           type: object
 *           description: Horarios de atención por día
 *           example:
 *             monday: { start: "08:00", end: "18:00" }
 *             tuesday: { start: "08:00", end: "18:00" }
 */

/**
 * @swagger
 * /api/clinics:
 *   get:
 *     summary: Obtener todas las clínicas
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre, dirección o email
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtrar por ciudad
 *     responses:
 *       200:
 *         description: Lista de clínicas obtenida exitosamente
 */
router.get('/', authenticateToken, requireStaff, getAllClinics);

/**
 * @swagger
 * /api/clinics/cities:
 *   get:
 *     summary: Obtener ciudades disponibles
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ciudades
 */
router.get('/cities', authenticateToken, getCities);

/**
 * @swagger
 * /api/clinics/{id}:
 *   get:
 *     summary: Obtener clínica por ID
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clínica
 *     responses:
 *       200:
 *         description: Clínica encontrada
 *       404:
 *         description: Clínica no encontrada
 */
router.get('/:id', authenticateToken, requireStaff, getClinicById);

/**
 * @swagger
 * /api/clinics/{id}/stats:
 *   get:
 *     summary: Obtener estadísticas de la clínica
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 */
router.get('/:id/stats', authenticateToken, requireStaff, getClinicStats);

/**
 * @swagger
 * /api/clinics:
 *   post:
 *     summary: Crear nueva clínica (solo admin)
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Clinic'
 *     responses:
 *       201:
 *         description: Clínica creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Clínica ya existe
 */
router.post('/', [
    authenticateToken,
    requireAdmin,
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nombre debe tener entre 2 y 200 caracteres'),
    body('address')
        .trim()
        .notEmpty()
        .withMessage('Dirección es requerida'),
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono inválido'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('city')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Ciudad debe tener entre 2 y 100 caracteres'),
    body('state')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Estado no puede exceder 100 caracteres'),
    body('postalCode')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Código postal no puede exceder 20 caracteres'),
    body('openingHours')
        .optional()
        .isObject()
        .withMessage('Horarios de apertura deben ser un objeto válido')
], createClinic);

/**
 * @swagger
 * /api/clinics/{id}:
 *   put:
 *     summary: Actualizar clínica
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Clinic'
 *     responses:
 *       200:
 *         description: Clínica actualizada exitosamente
 *       404:
 *         description: Clínica no encontrada
 */
router.put('/:id', [
    authenticateToken,
    requireAdmin,
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nombre debe tener entre 2 y 200 caracteres'),
    body('address')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Dirección no puede estar vacía'),
    body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono inválido'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Ciudad debe tener entre 2 y 100 caracteres'),
    body('state')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Estado no puede exceder 100 caracteres'),
    body('postalCode')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Código postal no puede exceder 20 caracteres'),
    body('openingHours')
        .optional()
        .isObject()
        .withMessage('Horarios de apertura deben ser un objeto válido')
], updateClinic);

/**
 * @swagger
 * /api/clinics/{id}:
 *   delete:
 *     summary: Eliminar clínica (solo admin)
 *     tags: [Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Clínica eliminada exitosamente
 *       400:
 *         description: No se puede eliminar (tiene dependencias)
 *       404:
 *         description: Clínica no encontrada
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteClinic);

module.exports = router;