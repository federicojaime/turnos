const { executeQuery } = require('../config/database');

// Obtener disponibilidad de un doctor en una fecha
async function getDoctorAvailability(doctorId, date) {
	// Ejemplo: obtener turnos ocupados y calcular libres
	const query = `SELECT appointment_date FROM appointments WHERE doctor_id = ? AND DATE(appointment_date) = ? AND is_active = 1 AND status = 'scheduled'`;
	const appointments = await executeQuery(query, [doctorId, date]);
	// Aquí deberías calcular los horarios libres según la duración de consulta y horarios del doctor
	return appointments;
}

module.exports = { getDoctorAvailability };
