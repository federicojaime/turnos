const { executeQuery, findById, findAll, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Listar turnos con paginación y filtros
const getAllAppointments = async (req, res) => {
	try {
		const { page = 1, limit = 10, status = '', doctor_id = '', patient_id = '' } = req.query;
		let where = 'is_active = 1';
		let params = [];
		if (status) {
			where += ' AND status = ?';
			params.push(status);
		}
		if (doctor_id) {
			where += ' AND doctor_id = ?';
			params.push(doctor_id);
		}
		if (patient_id) {
			where += ' AND patient_id = ?';
			params.push(patient_id);
		}
		const offset = (page - 1) * limit;
		const query = `SELECT * FROM appointments WHERE ${where} LIMIT ${limit} OFFSET ${offset}`;
		const appointments = await executeQuery(query, params);
		const count = await executeQuery(`SELECT COUNT(*) as total FROM appointments WHERE ${where}`, params);
		res.json({
			success: true,
			data: appointments,
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

// Obtener turno por ID
const getAppointmentById = async (req, res) => {
	try {
		const { id } = req.params;
		const appointment = await findById('appointments', id);
		if (!appointment) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
		res.json({ success: true, data: appointment });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Crear turno
const createAppointment = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { patient_id, doctor_id, clinic_id, appointment_date, status, notes } = req.body;
		const appointmentData = { patient_id, doctor_id, clinic_id, appointment_date, status, notes, is_active: 1 };
		const appointmentId = await create('appointments', appointmentData);
		res.status(201).json({ success: true, data: { id: appointmentId, ...appointmentData } });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Actualizar turno
const updateAppointment = async (req, res) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
		const { id } = req.params;
		const { appointment_date, status, notes } = req.body;
		const updateData = {};
		if (appointment_date) updateData.appointment_date = appointment_date;
		if (status) updateData.status = status;
		if (notes) updateData.notes = notes;
		const updated = await update('appointments', id, updateData);
		if (!updated) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
		res.json({ success: true, message: 'Turno actualizado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

// Eliminar turno (soft delete)
const deleteAppointment = async (req, res) => {
	try {
		const { id } = req.params;
		const deleted = await softDelete('appointments', id);
		if (!deleted) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
		res.json({ success: true, message: 'Turno eliminado' });
	} catch (error) {
		res.status(500).json({ success: false, message: 'Error interno del servidor' });
	}
};

module.exports = {
	getAllAppointments,
	getAppointmentById,
	createAppointment,
	updateAppointment,
	deleteAppointment
};
