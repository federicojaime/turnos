const { executeQuery, findById, findAll, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Listar doctores con paginación
const getAllDoctors = async (req, res) => {
	try {
		const { page = 1, limit = 10, search = '' } = req.query;
		let where = 'is_active = 1';
		let params = [];
		if (search) {
			where += ' AND (license_number LIKE ? OR consultation_duration LIKE ?)';
			params.push(`%${search}%`, `%${search}%`);
		}
		const offset = (page - 1) * limit;
		const query = `SELECT * FROM doctors WHERE ${where} LIMIT ${limit} OFFSET ${offset}`;
		const doctors = await executeQuery(query, params);
		const count = await executeQuery(`SELECT COUNT(*) as total FROM doctors WHERE ${where}`, params);
		res.json({
			success: true,
			data: doctors,
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

// Obtener doctor por ID
const getDoctorById = async (req, res) => {
	try {
		const { id } = req.params;
		const doctor = await findById('doctors', id);
		if (!doctor) return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
		res.json({ success: true, data: doctor });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Crear doctor
const createDoctor = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { user_id, clinic_id, specialty_id, license_number, consultation_duration } = req.body;
		const doctorData = { user_id, clinic_id, specialty_id, license_number, consultation_duration, is_active: 1 };
		const doctorId = await create('doctors', doctorData);
		res.status(201).json({ success: true, data: { id: doctorId, ...doctorData } });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Actualizar doctor
const updateDoctor = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { id } = req.params;
		const { clinic_id, specialty_id, license_number, consultation_duration } = req.body;
		const updateData = {};
		if (clinic_id) updateData.clinic_id = clinic_id;
		if (specialty_id) updateData.specialty_id = specialty_id;
		if (license_number) updateData.license_number = license_number;
		if (consultation_duration) updateData.consultation_duration = consultation_duration;
		const updated = await update('doctors', id, updateData);
		if (!updated) return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
		res.json({ success: true, message: 'Doctor actualizado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Eliminar doctor (soft delete)
const deleteDoctor = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await softDelete('doctors', id);
		if (!deleted) return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
		res.json({ success: true, message: 'Doctor eliminado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

module.exports = {
	getAllDoctors,
	getDoctorById,
	createDoctor,
	updateDoctor,
	deleteDoctor
};
