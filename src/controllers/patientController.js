const { executeQuery, findById, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los pacientes con información completa
const getAllPatients = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            gender = '',
            orderBy = 'u.last_name',
            orderDir = 'ASC'
        } = req.query;

        let whereClause = 'p.is_active = 1 AND u.is_active = 1';
        let queryParams = [];

        // Filtro por búsqueda
        if (search) {
            whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR p.insurance_number LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Filtro por género
        if (gender) {
            whereClause += ' AND p.gender = ?';
            queryParams.push(gender);
        }

        const offset = (page - 1) * limit;
        const patientsQuery = `
            SELECT 
                p.id,
                p.user_id,
                p.birth_date,
                p.gender,
                p.blood_type,
                p.emergency_contact_name,
                p.emergency_contact_phone,
                p.insurance_provider,
                p.insurance_number,
                p.created_at,
                p.updated_at,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) as age,
                COUNT(DISTINCT a.id) as total_appointments,
                COUNT(DISTINCT CASE WHEN a.appointment_date >= CURDATE() AND a.status = 'scheduled' THEN a.id END) as upcoming_appointments,
                MAX(a.appointment_date) as last_appointment_date
            FROM patients p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN appointments a ON p.id = a.patient_id
            WHERE ${whereClause}
            GROUP BY p.id
            ORDER BY ${orderBy} ${orderDir}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const patients = await executeQuery(patientsQuery, queryParams);

        // Contar total
        const countQuery = `
            SELECT COUNT(DISTINCT p.id) as total 
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE ${whereClause}
        `;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            message: 'Pacientes obtenidos exitosamente',
            data: patients,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo pacientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener paciente por ID con información detallada
const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        const patientQuery = `
            SELECT 
                p.*,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                TIMESTAMPDIFF(YEAR, p.birth_date, CURDATE()) as age
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ? AND p.is_active = 1
        `;

        const patients = await executeQuery(patientQuery, [id]);

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const patient = patients[0];

        // Obtener historial de turnos del paciente
        const appointmentsQuery = `
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.notes,
                a.duration,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                s.name as specialty_name,
                c.name as clinic_name,
                c.address as clinic_address
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT 10
        `;
        const appointments = await executeQuery(appointmentsQuery, [id]);
        patient.recent_appointments = appointments;

        // Obtener estadísticas del paciente
        const statsQuery = `
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
                COUNT(CASE WHEN appointment_date >= CURDATE() AND status = 'scheduled' THEN 1 END) as upcoming_appointments,
                MIN(appointment_date) as first_appointment,
                MAX(appointment_date) as last_appointment
            FROM appointments
            WHERE patient_id = ?
        `;
        const stats = await executeQuery(statsQuery, [id]);
        patient.stats = stats[0];

        res.json({
            success: true,
            message: 'Paciente obtenido exitosamente',
            data: patient
        });

    } catch (error) {
        console.error('Error obteniendo paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Crear nuevo paciente
const createPatient = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const {
            userId,
            birthDate,
            gender,
            bloodType,
            medicalHistory,
            emergencyContactName,
            emergencyContactPhone,
            insuranceProvider,
            insuranceNumber
        } = req.body;

        // Verificar que el usuario existe y no es ya un paciente
        const userQuery = `
            SELECT u.*, p.id as patient_id 
            FROM users u 
            LEFT JOIN patients p ON u.id = p.user_id AND p.is_active = 1
            WHERE u.id = ? AND u.is_active = 1
        `;
        const users = await executeQuery(userQuery, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (users[0].patient_id) {
            return res.status(409).json({
                success: false,
                message: 'El usuario ya es paciente'
            });
        }

        // Verificar duplicado de número de seguro si se proporciona
        if (insuranceNumber) {
            const existingInsurance = await executeQuery(
                'SELECT id FROM patients WHERE insurance_number = ? AND is_active = 1',
                [insuranceNumber]
            );

            if (existingInsurance.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un paciente con ese número de seguro'
                });
            }
        }

        const patientData = {
            user_id: userId,
            birth_date: birthDate,
            gender: gender || 'Other',
            blood_type: bloodType,
            medical_history: medicalHistory,
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            insurance_provider: insuranceProvider,
            insurance_number: insuranceNumber
        };

        const patientId = await create('patients', patientData);

        res.status(201).json({
            success: true,
            message: 'Paciente creado exitosamente',
            data: {
                id: patientId,
                ...patientData
            }
        });

    } catch (error) {
        console.error('Error creando paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar paciente
const updatePatient = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const {
            birthDate,
            gender,
            bloodType,
            medicalHistory,
            emergencyContactName,
            emergencyContactPhone,
            insuranceProvider,
            insuranceNumber
        } = req.body;

        // Verificar que el paciente existe
        const existingPatient = await findById('patients', id);
        if (!existingPatient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const updateData = {};

        if (birthDate) updateData.birth_date = birthDate;
        if (gender) updateData.gender = gender;
        if (bloodType) updateData.blood_type = bloodType;
        if (medicalHistory !== undefined) updateData.medical_history = medicalHistory;
        if (emergencyContactName) updateData.emergency_contact_name = emergencyContactName;
        if (emergencyContactPhone) updateData.emergency_contact_phone = emergencyContactPhone;
        if (insuranceProvider) updateData.insurance_provider = insuranceProvider;

        if (insuranceNumber) {
            // Verificar duplicado de número de seguro
            const existingInsurance = await executeQuery(
                'SELECT id FROM patients WHERE insurance_number = ? AND id != ? AND is_active = 1',
                [insuranceNumber, id]
            );

            if (existingInsurance.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otro paciente con ese número de seguro'
                });
            }
            updateData.insurance_number = insuranceNumber;
        }

        const updated = await update('patients', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el paciente'
            });
        }

        res.json({
            success: true,
            message: 'Paciente actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar paciente (soft delete)
const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el paciente existe
        const existingPatient = await findById('patients', id);
        if (!existingPatient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Verificar si tiene turnos futuros
        const futureAppointments = await executeQuery(
            'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ? AND appointment_date >= CURDATE() AND status NOT IN ("cancelled", "completed")',
            [id]
        );

        if (futureAppointments[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el paciente porque tiene turnos futuros programados'
            });
        }

        const deleted = await softDelete('patients', id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el paciente'
            });
        }

        res.json({
            success: true,
            message: 'Paciente eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando paciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener historial médico completo del paciente
const getPatientMedicalHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el paciente existe
        const patient = await findById('patients', id);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const historyQuery = `
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.notes,
                a.duration,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                s.name as specialty_name,
                c.name as clinic_name,
                c.address as clinic_address,
                ah.previous_status,
                ah.new_status,
                ah.change_reason,
                ah.created_at as change_date
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            LEFT JOIN appointment_history ah ON a.id = ah.appointment_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;

        const history = await executeQuery(historyQuery, [id]);

        res.json({
            success: true,
            message: 'Historial médico obtenido exitosamente',
            data: {
                patient_id: id,
                medical_history: patient.medical_history,
                appointments: history
            }
        });

    } catch (error) {
        console.error('Error obteniendo historial médico:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener próximos turnos del paciente
const getPatientUpcomingAppointments = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el paciente existe
        const patient = await findById('patients', id);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const appointmentsQuery = `
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.notes,
                a.duration,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                s.name as specialty_name,
                c.name as clinic_name,
                c.address as clinic_address,
                c.phone as clinic_phone
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            WHERE a.patient_id = ? 
              AND a.appointment_date >= CURDATE() 
              AND a.status IN ('scheduled', 'confirmed')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `;

        const appointments = await executeQuery(appointmentsQuery, [id]);

        res.json({
            success: true,
            message: 'Próximos turnos obtenidos exitosamente',
            data: appointments
        });

    } catch (error) {
        console.error('Error obteniendo próximos turnos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientMedicalHistory,
    getPatientUpcomingAppointments
};