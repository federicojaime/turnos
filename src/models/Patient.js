class Patient {
	constructor(data) {
		this.id = data.id;
		this.user_id = data.user_id;
		this.birth_date = data.birth_date;
		this.gender = data.gender;
		this.address = data.address;
		this.phone = data.phone;
		this.is_active = data.is_active;
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
	}
}

module.exports = Patient;
