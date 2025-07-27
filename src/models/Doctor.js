class Doctor {
	constructor(data) {
		this.id = data.id;
		this.user_id = data.user_id;
		this.clinic_id = data.clinic_id;
		this.specialty_id = data.specialty_id;
		this.license_number = data.license_number;
		this.consultation_duration = data.consultation_duration;
		this.is_active = data.is_active;
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
	}
}

module.exports = Doctor;
