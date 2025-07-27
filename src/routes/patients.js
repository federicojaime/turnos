const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, requireStaff } = require('../middleware/auth');
const { body } = require('express-validator');

// Listar pacientes
router.get('/', authenticateToken, requireStaff, patientController.getAllPatients);

// Obtener paciente por ID
router.get('/:id', authenticateToken, requireStaff, patientController.getPatientById);

// Crear paciente
router.post(
	'/',
	authenticateToken,
	requireStaff,
	[
		body('user_id').isInt().notEmpty(),
		body('birth_date').isDate(),
		body('gender').isIn(['male', 'female', 'other']),
		body('address').isString().notEmpty(),
		body('phone').isString().notEmpty()
	],
	patientController.createPatient
);

// Actualizar paciente
router.put(
	'/:id',
	authenticateToken,
	requireStaff,
	[
		body('birth_date').optional().isDate(),
		body('gender').optional().isIn(['male', 'female', 'other']),
		body('address').optional().isString(),
		body('phone').optional().isString()
	],
	patientController.updatePatient
);

// Eliminar paciente
router.delete('/:id', authenticateToken, requireStaff, patientController.deletePatient);

module.exports = router;
