const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    deleteAppointment,
    getDoctorAvailability,
    getTodayAppointments,
    getAppointmentStats,
    confirmAppointment,
    completeAppointment
} = require('../controllers/appointmentController');

const { authenticateToken, requireStaff, requirePatientAccess } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentCreate:
 *       type: object
 *       required:
 *         - patientId
 *         - doctorId
 *         - clinicId
 *         - appointmentDate
 *         - appointmentTime
 *       properties:
 *         patientId:
 *           type: integer
 *           example: 1
 *         doctorId:
 *           type: integer
 *           example: 1
 *         clinicId:
 *           type: integer
 *           example: 1
 *         appointmentDate:
 *           type: string
 *           format: date
 *           example: '2024-03-15'
 *         appointmentTime:
 *           type: string
 *           format: time
 *           example: '14:30'
 *         reason:
 *           type: string
 *           example: 'Control médico rutinario'
 *         notes:
 *           type: string
 *           example: 'Paciente en ayunas'
 *         duration:
 *           type: integer
 *           example: 30
 */

/**
 * @swagger
 * /api/appointments/availability/{doctorId}/{date}:
 *   get:
 *     summary: Obtener disponibilidad de un médico en una fecha (PÚBLICO)
 *     tags: [Turnos]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Disponibilidad obtenida exitosamente
 *       404:
 *         description: Médico no encontrado
 */
router.get('/availability/:doctorId/:date', [
    param('doctorId').isInt().withMessage('ID de médico debe ser un número entero'),
    param('date').isDate().withMessage('Fecha debe ser válida (YYYY-MM-DD)')
], getDoctorAvailability);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Obtener todos los turnos (solo staff)
 *     tags: [Turnos]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled, no_show]
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: clinicId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de turnos obtenida exitosamente
 */
router.get('/', [
    authenticateToken,
    requireStaff,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
    query('doctorId').optional().isInt(),
    query('patientId').optional().isInt(),
    query('clinicId').optional().isInt(),
    query('dateFrom').optional().isDate(),
    query('dateTo').optional().isDate()
], getAllAppointments);

/**
 * @swagger
 * /api/appointments/today:
 *   get:
 *     summary: Obtener turnos de hoy (solo staff)
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clinicId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Turnos de hoy obtenidos exitosamente
 */
router.get('/today', [
    authenticateToken,
    requireStaff,
    query('clinicId').optional().isInt(),
    query('doctorId').optional().isInt()
], getTodayAppointments);

/**
 * @swagger
 * /api/appointments/stats:
 *   get:
 *     summary: Obtener estadísticas de turnos (solo staff)
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
 *       - in: query
 *         name: clinicId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats', [
    authenticateToken,
    requireStaff,
    query('period').optional().isIn(['today', 'week', 'month', 'year']),
    query('clinicId').optional().isInt(),
    query('doctorId').optional().isInt()
], getAppointmentStats);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Obtener turno por ID (solo staff o paciente propietario)
 *     tags: [Turnos]
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
 *         description: Turno encontrado
 *       404:
 *         description: Turno no encontrado
 */
router.get('/:id', [
    authenticateToken,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getAppointmentById);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Crear nuevo turno (staff o pacientes autenticados)
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentCreate'
 *     responses:
 *       201:
 *         description: Turno creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Horario no disponible
 */
router.post('/', [
    authenticateToken, // Cualquier usuario autenticado puede crear turnos
    body('patientId')
        .isInt()
        .withMessage('ID de paciente debe ser un número entero'),
    body('doctorId')
        .isInt()
        .withMessage('ID de médico debe ser un número entero'),
    body('clinicId')
        .isInt()
        .withMessage('ID de clínica debe ser un número entero'),
    body('appointmentDate')
        .isDate()
        .withMessage('Fecha de turno debe ser válida (YYYY-MM-DD)')
        .custom((value) => {
            const appointmentDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (appointmentDate < today) {
                throw new Error('La fecha del turno no puede ser en el pasado');
            }
            return true;
        }),
    body('appointmentTime')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Hora del turno debe ser válida (HH:MM)'),
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Motivo no puede exceder 500 caracteres'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notas no pueden exceder 1000 caracteres'),
    body('duration')
        .optional()
        .isInt({ min: 15, max: 180 })
        .withMessage('Duración debe ser entre 15 y 180 minutos')
], createAppointment);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Actualizar turno (solo staff)
 *     tags: [Turnos]
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
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *               appointmentTime:
 *                 type: string
 *                 format: time
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, completed, cancelled, no_show]
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Turno actualizado exitosamente
 *       404:
 *         description: Turno no encontrado
 */
router.put('/:id', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('appointmentDate')
        .optional()
        .isDate()
        .withMessage('Fecha de turno debe ser válida (YYYY-MM-DD)'),
    body('appointmentTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Hora del turno debe ser válida (HH:MM)'),
    body('status')
        .optional()
        .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])
        .withMessage('Estado inválido'),
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Motivo no puede exceder 500 caracteres'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notas no pueden exceder 1000 caracteres'),
    body('cancellationReason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Motivo de cancelación no puede exceder 500 caracteres')
], updateAppointment);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   put:
 *     summary: Cancelar turno (staff o paciente propietario)
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 example: 'Paciente enfermo'
 *     responses:
 *       200:
 *         description: Turno cancelado exitosamente
 */
router.put('/:id/cancel', [
    authenticateToken,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('cancellationReason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Motivo de cancelación no puede exceder 500 caracteres')
], cancelAppointment);

/**
 * @swagger
 * /api/appointments/{id}/confirm:
 *   put:
 *     summary: Confirmar turno (solo staff)
 *     tags: [Turnos]
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
 *         description: Turno confirmado exitosamente
 */
router.put('/:id/confirm', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero')
], confirmAppointment);

/**
 * @swagger
 * /api/appointments/{id}/complete:
 *   put:
 *     summary: Completar turno (solo staff)
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: 'Consulta completada sin observaciones'
 *     responses:
 *       200:
 *         description: Turno completado exitosamente
 */
router.put('/:id/complete', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notas no pueden exceder 1000 caracteres')
], completeAppointment);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Eliminar turno (solo staff)
 *     tags: [Turnos]
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
 *         description: Turno eliminado exitosamente
 *       400:
 *         description: No se puede eliminar el turno
 */
router.delete('/:id', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero')
], deleteAppointment);

module.exports = router;