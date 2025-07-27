class Clinic {
	constructor(data) {
		this.id = data.id;
		this.name = data.name;
		this.address = data.address;
		this.phone = data.phone;
		this.email = data.email;
		this.city = data.city;
		this.state = data.state;
		this.postal_code = data.postal_code;
		this.opening_hours = data.opening_hours;
		this.is_active = data.is_active;
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
	}
}

module.exports = Clinic;
