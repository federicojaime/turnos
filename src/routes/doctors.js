const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { body } = require('express-validator');

// Listar doctores
router.get('/', authenticateToken, requireStaff, doctorController.getAllDoctors);

// Obtener doctor por ID
router.get('/:id', authenticateToken, requireStaff, doctorController.getDoctorById);

// Crear doctor
router.post(
	'/',
	authenticateToken,
	requireStaff,
	[
		body('user_id').isInt().notEmpty(),
		body('clinic_id').isInt().notEmpty(),
		body('specialty_id').isInt().notEmpty(),
		body('license_number').isString().notEmpty(),
		body('consultation_duration').isInt().notEmpty()
	],
	doctorController.createDoctor
);

// Actualizar doctor
router.put(
	'/:id',
	authenticateToken,
	requireStaff,
	[
		body('clinic_id').optional().isInt(),
		body('specialty_id').optional().isInt(),
		body('license_number').optional().isString(),
		body('consultation_duration').optional().isInt()
	],
	doctorController.updateDoctor
);

// Eliminar doctor
router.delete('/:id', authenticateToken, requireStaff, doctorController.deleteDoctor);

module.exports = router;
