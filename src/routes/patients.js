const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientMedicalHistory,
    getPatientUpcomingAppointments
} = require('../controllers/patientController');

const { authenticateToken, requireStaff, requirePatientAccess, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Listar pacientes
 *     tags: [Pacientes]
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
 *         description: Búsqueda por nombre, email o teléfono
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [M, F, Other]
 *         description: Filtrar por género
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida exitosamente
 */
router.get('/', [
    authenticateToken,
    requireStaff,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('gender').optional().isIn(['M', 'F', 'Other'])
], getAllPatients);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Obtener paciente por ID
 *     tags: [Pacientes]
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
 *         description: Paciente encontrado
 *       404:
 *         description: Paciente no encontrado
 */
router.get('/:id', [
    authenticateToken,
    requirePatientAccess,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getPatientById);

/**
 * @swagger
 * /api/patients/{id}/history:
 *   get:
 *     summary: Obtener historial médico del paciente
 *     tags: [Pacientes]
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
 *         description: Historial médico obtenido exitosamente
 */
router.get('/:id/history', [
    authenticateToken,
    requirePatientAccess,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getPatientMedicalHistory);

/**
 * @swagger
 * /api/patients/{id}/upcoming:
 *   get:
 *     summary: Obtener próximos turnos del paciente
 *     tags: [Pacientes]
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
 *         description: Próximos turnos obtenidos exitosamente
 */
router.get('/:id/upcoming', [
    authenticateToken,
    requirePatientAccess,
    param('id').isInt().withMessage('ID debe ser un número entero')
], getPatientUpcomingAppointments);

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Crear paciente
 *     tags: [Pacientes]
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
 *             properties:
 *               userId:
 *                 type: integer
 *               birthDate:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [M, F, Other]
 *               bloodType:
 *                 type: string
 *               medicalHistory:
 *                 type: string
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               insuranceProvider:
 *                 type: string
 *               insuranceNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
 */
router.post('/', [
    authenticateToken,
    requireStaff,
    body('userId')
        .isInt()
        .withMessage('ID de usuario debe ser un número entero'),
    body('birthDate')
        .optional()
        .isDate()
        .withMessage('Fecha de nacimiento debe ser válida')
        .custom((value) => {
            if (value) {
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                
                if (age < 0 || age > 150) {
                    throw new Error('Fecha de nacimiento no válida');
                }
            }
            return true;
        }),
    body('gender')
        .optional()
        .isIn(['M', 'F', 'Other'])
        .withMessage('Género debe ser M, F o Other'),
    body('bloodType')
        .optional()
        .trim()
        .isLength({ max: 5 })
        .withMessage('Tipo de sangre no puede exceder 5 caracteres'),
    body('medicalHistory')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Historia médica no puede exceder 2000 caracteres'),
    body('emergencyContactName')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Nombre de contacto de emergencia no puede exceder 200 caracteres'),
    body('emergencyContactPhone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono de emergencia inválido'),
    body('insuranceProvider')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Proveedor de seguro no puede exceder 200 caracteres'),
    body('insuranceNumber')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Número de seguro no puede exceder 100 caracteres')
], createPatient);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Actualizar paciente
 *     tags: [Pacientes]
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
 *               birthDate:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [M, F, Other]
 *               bloodType:
 *                 type: string
 *               medicalHistory:
 *                 type: string
 *               emergencyContactName:
 *                 type: string
 *               emergencyContactPhone:
 *                 type: string
 *               insuranceProvider:
 *                 type: string
 *               insuranceNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paciente actualizado exitosamente
 */
router.put('/:id', [
    authenticateToken,
    requireStaff,
    param('id').isInt().withMessage('ID debe ser un número entero'),
    body('birthDate')
        .optional()
        .isDate()
        .withMessage('Fecha de nacimiento debe ser válida')
        .custom((value) => {
            if (value) {
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                
                if (age < 0 || age > 150) {
                    throw new Error('Fecha de nacimiento no válida');
                }
            }
            return true;
        }),
    body('gender')
        .optional()
        .isIn(['M', 'F', 'Other'])
        .withMessage('Género debe ser M, F o Other'),
    body('bloodType')
        .optional()
        .trim()
        .isLength({ max: 5 })
        .withMessage('Tipo de sangre no puede exceder 5 caracteres'),
    body('medicalHistory')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Historia médica no puede exceder 2000 caracteres'),
    body('emergencyContactName')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Nombre de contacto de emergencia no puede exceder 200 caracteres'),
    body('emergencyContactPhone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Teléfono de emergencia inválido'),
    body('insuranceProvider')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Proveedor de seguro no puede exceder 200 caracteres'),
    body('insuranceNumber')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Número de seguro no puede exceder 100 caracteres')
], updatePatient);

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Eliminar paciente
 *     tags: [Pacientes]
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
 *         description: Paciente eliminado exitosamente
 *       400:
 *         description: No se puede eliminar (tiene turnos futuros)
 */
router.delete('/:id', [
    authenticateToken,
    requireAdmin,
    param('id').isInt().withMessage('ID debe ser un número entero')
], deletePatient);

module.exports = router;