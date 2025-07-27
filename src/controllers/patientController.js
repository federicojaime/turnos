const { executeQuery, findById, findAll, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Listar pacientes con paginación
const getAllPatients = async (req, res) => {
	try {
		const { page = 1, limit = 10, search = '' } = req.query;
		let where = 'is_active = 1';
		let params = [];
		if (search) {
			where += ' AND (address LIKE ? OR phone LIKE ?)';
			params.push(`%${search}%`, `%${search}%`);
		}
		const offset = (page - 1) * limit;
		const query = `SELECT * FROM patients WHERE ${where} LIMIT ${limit} OFFSET ${offset}`;
		const patients = await executeQuery(query, params);
		const count = await executeQuery(`SELECT COUNT(*) as total FROM patients WHERE ${where}`, params);
		res.json({
			success: true,
			data: patients,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: count[0].total,
				pages: Math.ceil(count[0].total / limit)
			}
		});
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Obtener paciente por ID
const getPatientById = async (req, res) => {
	try {
		const { id } = req.params;
		const patient = await findById('patients', id);
		if (!patient) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
		res.json({ success: true, data: patient });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Crear paciente
const createPatient = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { user_id, birth_date, gender, address, phone } = req.body;
		const patientData = { user_id, birth_date, gender, address, phone, is_active: 1 };
		const patientId = await create('patients', patientData);
		res.status(201).json({ success: true, data: { id: patientId, ...patientData } });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Actualizar paciente
const updatePatient = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { id } = req.params;
		const { birth_date, gender, address, phone } = req.body;
		const updateData = {};
		if (birth_date) updateData.birth_date = birth_date;
		if (gender) updateData.gender = gender;
		if (address) updateData.address = address;
		if (phone) updateData.phone = phone;
		const updated = await update('patients', id, updateData);
		if (!updated) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
		res.json({ success: true, message: 'Paciente actualizado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Eliminar paciente (soft delete)
const deletePatient = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await softDelete('patients', id);
		if (!deleted) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
		res.json({ success: true, message: 'Paciente eliminado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

module.exports = {
	getAllPatients,
	getPatientById,
	createPatient,
	updatePatient,
	deletePatient
};
