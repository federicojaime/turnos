const { executeQuery, findById, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los médicos con información completa
const getAllDoctors = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            clinicId = '',
            specialtyId = '',
            orderBy = 'u.last_name',
            orderDir = 'ASC'
        } = req.query;

        let whereClause = 'd.is_active = 1 AND u.is_active = 1';
        let queryParams = [];

        // Filtro por búsqueda
        if (search) {
            whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR d.license_number LIKE ? OR s.name LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Filtro por clínica
        if (clinicId) {
            whereClause += ' AND d.clinic_id = ?';
            queryParams.push(clinicId);
        }

        // Filtro por especialidad
        if (specialtyId) {
            whereClause += ' AND d.specialty_id = ?';
            queryParams.push(specialtyId);
        }

        const offset = (page - 1) * limit;
        const doctorsQuery = `
            SELECT 
                d.id,
                d.user_id,
                d.license_number,
                d.consultation_duration,
                d.created_at,
                d.updated_at,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                s.id as specialty_id,
                s.name as specialty_name,
                s.description as specialty_description,
                c.id as clinic_id,
                c.name as clinic_name,
                c.address as clinic_address,
                c.city as clinic_city,
                COUNT(DISTINCT a.id) as total_appointments,
                COUNT(DISTINCT CASE WHEN a.appointment_date >= CURDATE() AND a.status = 'scheduled' THEN a.id END) as upcoming_appointments
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON d.clinic_id = c.id
            LEFT JOIN appointments a ON d.id = a.doctor_id
            WHERE ${whereClause}
            GROUP BY d.id
            ORDER BY ${orderBy} ${orderDir}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const doctors = await executeQuery(doctorsQuery, queryParams);

        // Contar total
        const countQuery = `
            SELECT COUNT(DISTINCT d.id) as total 
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON d.clinic_id = c.id
            WHERE ${whereClause}
        `;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            message: 'Médicos obtenidos exitosamente',
            data: doctors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo médicos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener médico por ID con información detallada
const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;

        const doctorQuery = `
            SELECT 
                d.*,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                s.name as specialty_name,
                s.description as specialty_description,
                c.name as clinic_name,
                c.address as clinic_address,
                c.phone as clinic_phone,
                c.city as clinic_city
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON d.clinic_id = c.id
            WHERE d.id = ? AND d.is_active = 1
        `;

        const doctors = await executeQuery(doctorQuery, [id]);

        if (doctors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        const doctor = doctors[0];

        // Obtener horarios del médico
        const schedulesQuery = `
            SELECT day_of_week, start_time, end_time, is_active
            FROM doctor_schedules
            WHERE doctor_id = ?
            ORDER BY day_of_week
        `;
        const schedules = await executeQuery(schedulesQuery, [id]);
        doctor.schedules = schedules;

        // Obtener estadísticas del médico
        const statsQuery = `
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
                COUNT(CASE WHEN appointment_date >= CURDATE() AND status = 'scheduled' THEN 1 END) as upcoming_appointments
            FROM appointments
            WHERE doctor_id = ?
        `;
        const stats = await executeQuery(statsQuery, [id]);
        doctor.stats = stats[0];

        res.json({
            success: true,
            message: 'Médico obtenido exitosamente',
            data: doctor
        });

    } catch (error) {
        console.error('Error obteniendo médico:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Crear nuevo médico
const createDoctor = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { userId, clinicId, specialtyId, licenseNumber, consultationDuration } = req.body;

        // Verificar que el usuario existe y no es ya un médico
        const userQuery = `
            SELECT u.*, d.id as doctor_id 
            FROM users u 
            LEFT JOIN doctors d ON u.id = d.user_id AND d.is_active = 1
            WHERE u.id = ? AND u.is_active = 1
        `;
        const users = await executeQuery(userQuery, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (users[0].doctor_id) {
            return res.status(409).json({
                success: false,
                message: 'El usuario ya es médico'
            });
        }

        // Verificar que la clínica existe
        const clinic = await findById('clinics', clinicId);
        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: 'Clínica no encontrada'
            });
        }

        // Verificar que la especialidad existe
        const specialty = await findById('specialties', specialtyId);
        if (!specialty) {
            return res.status(404).json({
                success: false,
                message: 'Especialidad no encontrada'
            });
        }

        // Verificar que no existe otro médico con el mismo número de matrícula
        const existingLicense = await executeQuery(
            'SELECT id FROM doctors WHERE license_number = ? AND is_active = 1',
            [licenseNumber]
        );

        if (existingLicense.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un médico con ese número de matrícula'
            });
        }

        const doctorData = {
            user_id: userId,
            clinic_id: clinicId,
            specialty_id: specialtyId,
            license_number: licenseNumber,
            consultation_duration: consultationDuration || 30
        };

        const doctorId = await create('doctors', doctorData);

        res.status(201).json({
            success: true,
            message: 'Médico creado exitosamente',
            data: {
                id: doctorId,
                ...doctorData
            }
        });

    } catch (error) {
        console.error('Error creando médico:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar médico
const updateDoctor = async (req, res) => {
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
        const { clinicId, specialtyId, licenseNumber, consultationDuration } = req.body;

        // Verificar que el médico existe
        const existingDoctor = await findById('doctors', id);
        if (!existingDoctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        const updateData = {};

        if (clinicId) {
            const clinic = await findById('clinics', clinicId);
            if (!clinic) {
                return res.status(404).json({
                    success: false,
                    message: 'Clínica no encontrada'
                });
            }
            updateData.clinic_id = clinicId;
        }

        if (specialtyId) {
            const specialty = await findById('specialties', specialtyId);
            if (!specialty) {
                return res.status(404).json({
                    success: false,
                    message: 'Especialidad no encontrada'
                });
            }
            updateData.specialty_id = specialtyId;
        }

        if (licenseNumber) {
            const existingLicense = await executeQuery(
                'SELECT id FROM doctors WHERE license_number = ? AND id != ? AND is_active = 1',
                [licenseNumber, id]
            );

            if (existingLicense.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otro médico con ese número de matrícula'
                });
            }
            updateData.license_number = licenseNumber;
        }

        if (consultationDuration) {
            updateData.consultation_duration = consultationDuration;
        }

        const updated = await update('doctors', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el médico'
            });
        }

        res.json({
            success: true,
            message: 'Médico actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando médico:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar médico (soft delete)
const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el médico existe
        const existingDoctor = await findById('doctors', id);
        if (!existingDoctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        // Verificar si tiene turnos futuros
        const futureAppointments = await executeQuery(
            'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date >= CURDATE() AND status NOT IN ("cancelled", "completed")',
            [id]
        );

        if (futureAppointments[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar el médico porque tiene turnos futuros programados'
            });
        }

        const deleted = await softDelete('doctors', id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el médico'
            });
        }

        res.json({
            success: true,
            message: 'Médico eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando médico:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener horarios del médico
const getDoctorSchedules = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el médico existe
        const doctor = await findById('doctors', id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        const schedulesQuery = `
            SELECT day_of_week, start_time, end_time, is_active
            FROM doctor_schedules
            WHERE doctor_id = ?
            ORDER BY day_of_week
        `;
        const schedules = await executeQuery(schedulesQuery, [id]);

        res.json({
            success: true,
            message: 'Horarios obtenidos exitosamente',
            data: schedules
        });

    } catch (error) {
        console.error('Error obteniendo horarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar horarios del médico
const updateDoctorSchedules = async (req, res) => {
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
        const { schedules } = req.body;

        // Verificar que el médico existe
        const doctor = await findById('doctors', id);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        // Eliminar horarios existentes
        await executeQuery('DELETE FROM doctor_schedules WHERE doctor_id = ?', [id]);

        // Insertar nuevos horarios
        for (const schedule of schedules) {
            const { dayOfWeek, startTime, endTime, isActive = true } = schedule;
            
            await executeQuery(
                'INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active) VALUES (?, ?, ?, ?, ?)',
                [id, dayOfWeek, startTime, endTime, isActive]
            );
        }

        res.json({
            success: true,
            message: 'Horarios actualizados exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando horarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener especialidades disponibles
const getSpecialties = async (req, res) => {
    try {
        const specialtiesQuery = `
            SELECT id, name, description
            FROM specialties
            WHERE is_active = 1
            ORDER BY name ASC
        `;
        const specialties = await executeQuery(specialtiesQuery);

        res.json({
            success: true,
            message: 'Especialidades obtenidas exitosamente',
            data: specialties
        });

    } catch (error) {
        console.error('Error obteniendo especialidades:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorSchedules,
    updateDoctorSchedules,
    getSpecialties
};