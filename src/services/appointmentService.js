const { executeQuery, create, update, softDelete } = require('../config/database');

// Crear un turno
async function createAppointment(data) {
	return await create('appointments', data);
}

// Actualizar un turno
async function updateAppointment(id, data) {
	return await update('appointments', id, data);
}

// Eliminar un turno (soft delete)
async function deleteAppointment(id) {
	return await softDelete('appointments', id);
}

module.exports = {
	createAppointment,
	updateAppointment,
	deleteAppointment
};
