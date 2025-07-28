const { executeQuery, findById, findAll, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todas las clínicas - PÚBLICO CON INFORMACIÓN BÁSICA
const getAllClinics = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            city = '',
            orderBy = 'name',
            orderDir = 'ASC'
        } = req.query;

        let whereClause = 'is_active = 1';
        let queryParams = [];

        // Filtro por búsqueda
        if (search) {
            whereClause += ' AND (name LIKE ? OR address LIKE ? OR city LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Filtro por ciudad
        if (city) {
            whereClause += ' AND city = ?';
            queryParams.push(city);
        }

        const offset = (page - 1) * limit;
        
        // Información básica para público, completa para staff
        let selectFields = 'id, name, address, phone, city, state, opening_hours';
        
        // Si es staff autenticado, mostrar información adicional
        if (req.user && ['admin', 'secretary'].includes(req.user.role)) {
            selectFields += ', email, postal_code, created_at, updated_at';
        }

        const clinicsQuery = `
            SELECT ${selectFields}
            FROM clinics 
            WHERE ${whereClause}
            ORDER BY ${orderBy} ${orderDir}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const clinics = await executeQuery(clinicsQuery, queryParams);

        // Contar total
        const countQuery = `SELECT COUNT(*) as total FROM clinics WHERE ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            message: 'Clínicas obtenidas exitosamente',
            data: clinics,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo clínicas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener clínica por ID - PÚBLICO CON INFORMACIÓN BÁSICA
const getClinicById = async (req, res) => {
    try {
        const { id } = req.params;

        // Información básica para público
        let selectFields = `
            c.id, c.name, c.address, c.phone, c.city, c.state, c.opening_hours,
            COUNT(DISTINCT d.id) as total_doctors
        `;
        
        // Si es staff autenticado, mostrar información adicional
        if (req.user && ['admin', 'secretary'].includes(req.user.role)) {
            selectFields = `
                c.*,
                COUNT(DISTINCT d.id) as total_doctors,
                COUNT(DISTINCT a.id) as total_appointments_today
            `;
        }

        const clinicQuery = `
            SELECT ${selectFields}
            FROM clinics c
            LEFT JOIN doctors d ON c.id = d.clinic_id AND d.is_active = 1
            ${req.user && ['admin', 'secretary'].includes(req.user.role) 
                ? 'LEFT JOIN appointments a ON c.id = a.clinic_id AND DATE(a.appointment_date) = CURDATE()' 
                : ''}
            WHERE c.id = ? AND c.is_active = 1
            GROUP BY c.id
        `;

        const clinics = await executeQuery(clinicQuery, [id]);

        if (clinics.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Clínica no encontrada'
            });
        }

        const clinic = clinics[0];

        // Obtener médicos de la clínica (información pública)
        const doctorsQuery = `
            SELECT d.id, d.consultation_duration,
                   u.first_name, u.last_name,
                   s.name as specialty_name
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            JOIN specialties s ON d.specialty_id = s.id
            WHERE d.clinic_id = ? AND d.is_active = 1 AND u.is_active = 1
            ORDER BY u.last_name, u.first_name
        `;

        const doctors = await executeQuery(doctorsQuery, [id]);
        clinic.doctors = doctors;

        res.json({
            success: true,
            message: 'Clínica obtenida exitosamente',
            data: clinic
        });

    } catch (error) {
        console.error('Error obteniendo clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Crear nueva clínica (solo admin)
const createClinic = async (req, res) => {
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
            name,
            address,
            phone,
            email,
            city,
            state,
            postalCode,
            openingHours
        } = req.body;

        // Verificar si ya existe una clínica con el mismo nombre en la misma ciudad
        const existingClinic = await executeQuery(
            'SELECT id FROM clinics WHERE name = ? AND city = ? AND is_active = 1',
            [name, city]
        );

        if (existingClinic.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe una clínica con ese nombre en esta ciudad'
            });
        }

        // Validar y formatear horarios de apertura
        let formattedOpeningHours = null;
        if (openingHours) {
            try {
                formattedOpeningHours = JSON.stringify(openingHours);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de horarios de apertura inválido'
                });
            }
        }

        const clinicData = {
            name,
            address,
            phone,
            email,
            city,
            state,
            postal_code: postalCode,
            opening_hours: formattedOpeningHours
        };

        const clinicId = await create('clinics', clinicData);

        res.status(201).json({
            success: true,
            message: 'Clínica creada exitosamente',
            data: {
                id: clinicId,
                ...clinicData
            }
        });

    } catch (error) {
        console.error('Error creando clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar clínica (solo admin)
const updateClinic = async (req, res) => {
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
            name,
            address,
            phone,
            email,
            city,
            state,
            postalCode,
            openingHours
        } = req.body;

        // Verificar que la clínica existe
        const existingClinic = await findById('clinics', id);
        if (!existingClinic) {
            return res.status(404).json({
                success: false,
                message: 'Clínica no encontrada'
            });
        }

        // Verificar duplicados (excluyendo la clínica actual)
        if (name && city) {
            const duplicateClinic = await executeQuery(
                'SELECT id FROM clinics WHERE name = ? AND city = ? AND id != ? AND is_active = 1',
                [name, city, id]
            );

            if (duplicateClinic.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otra clínica con ese nombre en esta ciudad'
                });
            }
        }

        // Preparar datos para actualizar
        const updateData = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (postalCode) updateData.postal_code = postalCode;

        if (openingHours) {
            try {
                updateData.opening_hours = JSON.stringify(openingHours);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de horarios de apertura inválido'
                });
            }
        }

        const updated = await update('clinics', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la clínica'
            });
        }

        res.json({
            success: true,
            message: 'Clínica actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar clínica (soft delete) - solo admin
const deleteClinic = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la clínica existe
        const existingClinic = await findById('clinics', id);
        if (!existingClinic) {
            return res.status(404).json({
                success: false,
                message: 'Clínica no encontrada'
            });
        }

        // Verificar si tiene médicos activos
        const activeDoctors = await executeQuery(
            'SELECT COUNT(*) as count FROM doctors WHERE clinic_id = ? AND is_active = 1',
            [id]
        );

        if (activeDoctors[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la clínica porque tiene médicos activos'
            });
        }

        // Verificar si tiene turnos futuros
        const futureAppointments = await executeQuery(
            'SELECT COUNT(*) as count FROM appointments WHERE clinic_id = ? AND appointment_date >= CURDATE() AND status NOT IN ("cancelled", "completed")',
            [id]
        );

        if (futureAppointments[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la clínica porque tiene turnos futuros programados'
            });
        }

        const deleted = await softDelete('clinics', id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar la clínica'
            });
        }

        res.json({
            success: true,
            message: 'Clínica eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando clínica:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de la clínica (solo staff)
const getClinicStats = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la clínica existe
        const existingClinic = await findById('clinics', id);
        if (!existingClinic) {
            return res.status(404).json({
                success: false,
                message: 'Clínica no encontrada'
            });
        }

        const statsQuery = `
            SELECT 
                COUNT(DISTINCT d.id) as total_doctors,
                COUNT(DISTINCT p.id) as total_patients,
                COUNT(DISTINCT CASE WHEN a.appointment_date = CURDATE() THEN a.id END) as appointments_today,
                COUNT(DISTINCT CASE WHEN a.appointment_date >= CURDATE() AND a.status = 'scheduled' THEN a.id END) as upcoming_appointments,
                COUNT(DISTINCT CASE WHEN a.appointment_date < CURDATE() AND a.status = 'completed' THEN a.id END) as completed_appointments,
                COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END) as cancelled_appointments
            FROM clinics c
            LEFT JOIN doctors d ON c.id = d.clinic_id AND d.is_active = 1
            LEFT JOIN appointments a ON c.id = a.clinic_id
            LEFT JOIN patients p ON a.patient_id = p.id AND p.is_active = 1
            WHERE c.id = ? AND c.is_active = 1
        `;

        const stats = await executeQuery(statsQuery, [id]);

        res.json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: stats[0]
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener ciudades disponibles (público)
const getCities = async (req, res) => {
    try {
        const citiesQuery = `
            SELECT DISTINCT city 
            FROM clinics 
            WHERE is_active = 1 AND city IS NOT NULL AND city != ''
            ORDER BY city ASC
        `;

        const cities = await executeQuery(citiesQuery);

        res.json({
            success: true,
            message: 'Ciudades obtenidas exitosamente',
            data: cities.map(row => row.city)
        });

    } catch (error) {
        console.error('Error obteniendo ciudades:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllClinics,
    getClinicById,
    createClinic,
    updateClinic,
    deleteClinic,
    getClinicStats,
    getCities
};