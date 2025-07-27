class Appointment {
	constructor(data) {
		this.id = data.id;
		this.patient_id = data.patient_id;
		this.doctor_id = data.doctor_id;
		this.clinic_id = data.clinic_id;
		this.appointment_date = data.appointment_date;
		this.status = data.status;
		this.notes = data.notes;
		this.is_active = data.is_active;
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
	}
}

module.exports = Appointment;
