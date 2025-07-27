const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorSchedules,
    updateDoctorSchedules,
    getSpecialties
} = require('../controllers/doctorController');

const { authenticateToken, requireStaff, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * /api/doctors/specialties:
 *   get:
 *     summary: Obtener especialidades médicas
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Especialidades obtenidas exitosamente
 */
router.get('/specialties', authenticateToken, getSpecialties);

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Listar médicos
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre, apellido o matrícula
 *       - in: query
 *         name: clinicId
 *         schema:
 *           type: integer
 *         description: Filtrar por clínica
 *       - in: query
 *         name: specialtyId
 *         schema:
 *           type: integer
 *         description: Filtrar por especialidad
 *     responses:
 *       200:
 *         description: Lista de médicos obtenida exitosamente
 */
router.get('/', [
    authenticateToken,
    requireStaff,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('clinicId').optional().isInt(),
    query('specialtyId').optional().isInt()
], getAllDoctors);

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Obtener médico por ID
 *     tags: [Médicos]
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
 *         description: Médico encontrado
 *       404:
 *         description: Médico no encontrado
 */
router.get('/:id', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getDoctorById);

/**
 * @swagger
 * /api/doctors/{id}/schedules:
 *   get:
 *     summary: Obtener horarios del médico
 *     tags: [Médicos]
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
 *         description: Horarios obtenidos exitosamente
 */
router.get('/:id/schedules', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getDoctorSchedules);

/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Crear médico
 *     tags: [Médicos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - clinicId
 *               - specialtyId
 *               - licenseNumber
 *             properties:
 *               userId:
 *                 type: integer
 *               clinicId:
 *                 type: integer
 *               specialtyId:
 *                 type: integer
 *               licenseNumber:
 *                 type: string
 *               consultationDuration:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       201:
 *         description: Médico creado exitosamente
 */
router.post('/', [
    authenticateToken,
    requireAdmin,
    body('userId')
        .isInt()
        .withMessage('ID de usuario debe ser un número entero'),
    body('clinicId')
        .isInt()
        .withMessage('ID de clínica debe ser un número entero'),
    body('specialtyId')
        .isInt()
        .withMessage('ID de especialidad debe ser un número entero'),
    body('licenseNumber')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Número de matrícula debe tener entre 3 y 50 caracteres'),
    body('consultationDuration')
        .optional()
        .isInt({ min: 15, max: 180 })
        .withMessage('Duración de consulta debe ser entre 15 y 180 minutos')
], createDoctor);

/**
 * @swagger
 * /api/doctors/{id}:
 *   put:
 *     summary: Actualizar médico
 *     tags: [Médicos]
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
 *             type: object
 *             properties:
 *               clinicId:
 *                 type: integer
 *               specialtyId:
 *                 type: integer
 *               licenseNumber:
 *                 type: string
 *               consultationDuration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Médico actualizado exitosamente
 */
router.put('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('clinicId')
        .optional()
        .isInt()
        .withMessage('ID de clínica debe ser un número entero'),
    body('specialtyId')
        .optional()
        .isInt()
        .withMessage('ID de especialidad debe ser un número entero'),
    body('licenseNumber')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Número de matrícula debe tener entre 3 y 50 caracteres'),
    body('consultationDuration')
        .optional()
        .isInt({ min: 15, max: 180 })
        .withMessage('Duración de consulta debe ser entre 15 y 180 minutos')
], updateDoctor);

/**
 * @swagger
 * /api/doctors/{id}/schedules:
 *   put:
 *     summary: Actualizar horarios del médico
 *     tags: [Médicos]
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
 *             type: object
 *             required:
 *               - schedules
 *             properties:
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 7
 *                     startTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                     endTime:
 *                       type: string
 *                       pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                     isActive:
 *                       type: boolean
 *                       default: true
 *     responses:
 *       200:
 *         description: Horarios actualizados exitosamente
 */
router.put('/:id/schedules', [
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('schedules')
        .isArray()
        .withMessage('Schedules debe ser un array'),
    body('schedules.*.dayOfWeek')
        .isInt({ min: 1, max: 7 })
        .withMessage('Día de la semana debe ser entre 1 y 7'),
    body('schedules.*.startTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Hora de inicio debe ser válida (HH:MM)'),
    body('schedules.*.endTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Hora de fin debe ser válida (HH:MM)'),
    body('schedules.*.isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive debe ser un booleano')
], updateDoctorSchedules);

/**
 * @swagger
 * /api/doctors/{id}:
 *   delete:
 *     summary: Eliminar médico
 *     tags: [Médicos]
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
 *         description: Médico eliminado exitosamente
 *       400:
 *         description: No se puede eliminar (tiene turnos futuros)
 */
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('ID debe ser un número entero')
], deleteDoctor);

module.exports = router;