const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Listar turnos
router.get('/', authenticateToken, appointmentController.getAllAppointments);

// Obtener turno por ID
router.get('/:id', authenticateToken, appointmentController.getAppointmentById);

// Crear turno
router.post(
	'/',
	authenticateToken,
	[
		body('patient_id').isInt().notEmpty(),
		body('doctor_id').isInt().notEmpty(),
		body('clinic_id').isInt().notEmpty(),
		body('appointment_date').isISO8601().notEmpty(),
		body('status').isString().notEmpty(),
		body('notes').optional().isString()
	],
	appointmentController.createAppointment
);

// Actualizar turno
router.put(
	'/:id',
	authenticateToken,
	[
		body('appointment_date').optional().isISO8601(),
		body('status').optional().isString(),
		body('notes').optional().isString()
	],
	appointmentController.updateAppointment
);

// Eliminar turno
router.delete('/:id', authenticateToken, appointmentController.deleteAppointment);

module.exports = router;
