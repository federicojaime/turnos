const { executeQuery, findById, create, update, softDelete } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los turnos con información completa
const getAllAppointments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = '',
            doctorId = '',
            patientId = '',
            clinicId = '',
            dateFrom = '',
            dateTo = '',
            orderBy = 'appointment_date',
            orderDir = 'DESC'
        } = req.query;

        let whereClause = '1 = 1';
        let queryParams = [];

        // Filtros
        if (status) {
            whereClause += ' AND a.status = ?';
            queryParams.push(status);
        }

        if (doctorId) {
            whereClause += ' AND a.doctor_id = ?';
            queryParams.push(doctorId);
        }

        if (patientId) {
            whereClause += ' AND a.patient_id = ?';
            queryParams.push(patientId);
        }

        if (clinicId) {
            whereClause += ' AND a.clinic_id = ?';
            queryParams.push(clinicId);
        }

        if (dateFrom) {
            whereClause += ' AND a.appointment_date >= ?';
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereClause += ' AND a.appointment_date <= ?';
            queryParams.push(dateTo);
        }

        const offset = (page - 1) * limit;
        const appointmentsQuery = `
            SELECT 
                a.id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.notes,
                a.duration,
                a.created_at,
                a.updated_at,
                CONCAT(pu.first_name, ' ', pu.last_name) as patient_name,
                pu.email as patient_email,
                pu.phone as patient_phone,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                s.name as specialty_name,
                c.name as clinic_name,
                c.address as clinic_address,
                c.phone as clinic_phone,
                CONCAT(cu.first_name, ' ', cu.last_name) as created_by_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            LEFT JOIN users cu ON a.created_by = cu.id
            WHERE ${whereClause}
            ORDER BY a.${orderBy} ${orderDir}, a.appointment_time ${orderDir}
            LIMIT ${limit} OFFSET ${offset}
        `;

        const appointments = await executeQuery(appointmentsQuery, queryParams);

        // Contar total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN clinics c ON a.clinic_id = c.id
            WHERE ${whereClause}
        `;
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            message: 'Turnos obtenidos exitosamente',
            data: appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error obteniendo turnos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener turno por ID con información completa
const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const appointmentQuery = `
            SELECT 
                a.*,
                CONCAT(pu.first_name, ' ', pu.last_name) as patient_name,
                pu.email as patient_email,
                pu.phone as patient_phone,
                p.birth_date as patient_birth_date,
                p.gender as patient_gender,
                p.blood_type as patient_blood_type,
                p.medical_history as patient_medical_history,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                du.email as doctor_email,
                du.phone as doctor_phone,
                d.license_number as doctor_license,
                d.consultation_duration as doctor_consultation_duration,
                s.name as specialty_name,
                c.name as clinic_name,
                c.address as clinic_address,
                c.phone as clinic_phone,
                c.email as clinic_email
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            WHERE a.id = ?
        `;

        const appointments = await executeQuery(appointmentQuery, [id]);

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = appointments[0];

        // Obtener historial de cambios del turno
        const historyQuery = `
            SELECT 
                ah.*,
                CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
            FROM appointment_history ah
            LEFT JOIN users u ON ah.changed_by = u.id
            WHERE ah.appointment_id = ?
            ORDER BY ah.created_at DESC
        `;
        const history = await executeQuery(historyQuery, [id]);
        appointment.history = history;

        res.json({
            success: true,
            message: 'Turno obtenido exitosamente',
            data: appointment
        });

    } catch (error) {
        console.error('Error obteniendo turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Crear nuevo turno
const createAppointment = async (req, res) => {
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
            patientId,
            doctorId,
            clinicId,
            appointmentDate,
            appointmentTime,
            reason,
            notes,
            duration
        } = req.body;

        // Verificar que el paciente existe
        const patient = await findById('patients', patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Verificar que el médico existe
        const doctor = await findById('doctors', doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
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

        // Verificar que el médico pertenece a la clínica
        if (doctor.clinic_id !== parseInt(clinicId)) {
            return res.status(400).json({
                success: false,
                message: 'El médico no pertenece a la clínica especificada'
            });
        }

        const appointmentDuration = duration || doctor.consultation_duration || 30;

        // Verificar disponibilidad usando el stored procedure
        const availabilityQuery = 'CALL CheckAppointmentAvailability(?, ?, ?, ?, @available)';
        await executeQuery(availabilityQuery, [doctorId, appointmentDate, appointmentTime, appointmentDuration]);
        
        const availabilityResult = await executeQuery('SELECT @available as available');
        const isAvailable = availabilityResult[0].available;

        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'El horario seleccionado no está disponible'
            });
        }

        const appointmentData = {
            patient_id: patientId,
            doctor_id: doctorId,
            clinic_id: clinicId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'scheduled',
            reason: reason || '',
            notes: notes || '',
            duration: appointmentDuration,
            created_by: req.user.id
        };

        const appointmentId = await create('appointments', appointmentData);

        res.status(201).json({
            success: true,
            message: 'Turno creado exitosamente',
            data: {
                id: appointmentId,
                ...appointmentData
            }
        });

    } catch (error) {
        console.error('Error creando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar turno
const updateAppointment = async (req, res) => {
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
            appointmentDate,
            appointmentTime,
            status,
            reason,
            notes,
            cancellationReason
        } = req.body;

        // Verificar que el turno existe
        const existingAppointment = await executeQuery(
            'SELECT * FROM appointments WHERE id = ?',
            [id]
        );

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = existingAppointment[0];
        const updateData = {};

        // Si se cambia fecha/hora, verificar disponibilidad
        if (appointmentDate && appointmentTime) {
            if (appointmentDate !== appointment.appointment_date || appointmentTime !== appointment.appointment_time) {
                const availabilityQuery = 'CALL CheckAppointmentAvailability(?, ?, ?, ?, @available)';
                await executeQuery(availabilityQuery, [
                    appointment.doctor_id,
                    appointmentDate,
                    appointmentTime,
                    appointment.duration
                ]);
                
                const availabilityResult = await executeQuery('SELECT @available as available');
                const isAvailable = availabilityResult[0].available;

                if (!isAvailable) {
                    return res.status(409).json({
                        success: false,
                        message: 'El nuevo horario seleccionado no está disponible'
                    });
                }

                updateData.appointment_date = appointmentDate;
                updateData.appointment_time = appointmentTime;
            }
        }

        if (status) {
            // Validar transiciones de estado
            const validTransitions = {
                'scheduled': ['confirmed', 'cancelled'],
                'confirmed': ['completed', 'cancelled', 'no_show'],
                'completed': [],
                'cancelled': ['scheduled'],
                'no_show': []
            };

            if (!validTransitions[appointment.status].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede cambiar el estado de ${appointment.status} a ${status}`
                });
            }

            updateData.status = status;

            if (status === 'cancelled' && cancellationReason) {
                updateData.cancellation_reason = cancellationReason;
                updateData.cancelled_by = req.user.id;
            }
        }

        if (reason !== undefined) updateData.reason = reason;
        if (notes !== undefined) updateData.notes = notes;

        const updated = await update('appointments', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el turno'
            });
        }

        res.json({
            success: true,
            message: 'Turno actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Cancelar turno
const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellationReason } = req.body;

        const existingAppointment = await executeQuery(
            'SELECT * FROM appointments WHERE id = ?',
            [id]
        );

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = existingAppointment[0];

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'El turno ya está cancelado'
            });
        }

        if (['completed', 'no_show'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: 'No se puede cancelar un turno completado o con inasistencia'
            });
        }

        const updateData = {
            status: 'cancelled',
            cancellation_reason: cancellationReason || 'Cancelado por usuario',
            cancelled_by: req.user.id
        };

        const updated = await update('appointments', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo cancelar el turno'
            });
        }

        res.json({
            success: true,
            message: 'Turno cancelado exitosamente'
        });

    } catch (error) {
        console.error('Error cancelando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Eliminar turno (soft delete)
const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const existingAppointment = await executeQuery(
            'SELECT * FROM appointments WHERE id = ?',
            [id]
        );

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = existingAppointment[0];

        // Solo permitir eliminar turnos cancelados o en el futuro
        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un turno completado'
            });
        }

        const deleted = await softDelete('appointments', id);

        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el turno'
            });
        }

        res.json({
            success: true,
            message: 'Turno eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener disponibilidad de un médico en una fecha
const getDoctorAvailability = async (req, res) => {
    try {
        const { doctorId, date } = req.params;

        // Verificar que el médico existe
        const doctor = await findById('doctors', doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Médico no encontrado'
            });
        }

        // Obtener día de la semana (1=Lunes, 7=Domingo)
        const dayOfWeek = await executeQuery('SELECT DAYOFWEEK(?) as day', [date]);
        const day = dayOfWeek[0].day;

        // Obtener horarios del médico para ese día
        const scheduleQuery = `
            SELECT start_time, end_time
            FROM doctor_schedules
            WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1
        `;
        const schedules = await executeQuery(scheduleQuery, [doctorId, day]);

        if (schedules.length === 0) {
            return res.json({
                success: true,
                message: 'El médico no atiende en esta fecha',
                data: {
                    available_slots: []
                }
            });
        }

        // Obtener turnos ocupados para esa fecha
        const occupiedQuery = `
            SELECT appointment_time, duration
            FROM appointments
            WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')
            ORDER BY appointment_time
        `;
        const occupiedSlots = await executeQuery(occupiedQuery, [doctorId, date]);

        // Generar slots disponibles
        const availableSlots = [];
        const consultationDuration = doctor.consultation_duration || 30;

        for (const schedule of schedules) {
            const startTime = schedule.start_time;
            const endTime = schedule.end_time;
            
            let currentTime = startTime;
            
            while (currentTime < endTime) {
                const currentSlot = currentTime;
                
                // Verificar si este slot está ocupado
                const isOccupied = occupiedSlots.some(occupied => {
                    const occupiedStart = occupied.appointment_time;
                    const occupiedEnd = addMinutes(occupiedStart, occupied.duration);
                    const slotEnd = addMinutes(currentSlot, consultationDuration);
                    
                    return (currentSlot < occupiedEnd && slotEnd > occupiedStart);
                });

                if (!isOccupied) {
                    availableSlots.push({
                        time: currentSlot,
                        duration: consultationDuration
                    });
                }

                // Avanzar al siguiente slot
                currentTime = addMinutes(currentTime, consultationDuration);
            }
        }

        res.json({
            success: true,
            message: 'Disponibilidad obtenida exitosamente',
            data: {
                doctor_id: doctorId,
                date: date,
                consultation_duration: consultationDuration,
                available_slots: availableSlots
            }
        });

    } catch (error) {
        console.error('Error obteniendo disponibilidad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Función helper para sumar minutos a una hora
function addMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Obtener turnos de hoy
const getTodayAppointments = async (req, res) => {
    try {
        const { clinicId = '', doctorId = '' } = req.query;
        
        let whereClause = 'a.appointment_date = CURDATE()';
        let queryParams = [];

        if (clinicId) {
            whereClause += ' AND a.clinic_id = ?';
            queryParams.push(clinicId);
        }

        if (doctorId) {
            whereClause += ' AND a.doctor_id = ?';
            queryParams.push(doctorId);
        }

        const appointmentsQuery = `
            SELECT 
                a.id,
                a.appointment_time,
                a.status,
                a.reason,
                a.notes,
                a.duration,
                CONCAT(pu.first_name, ' ', pu.last_name) as patient_name,
                pu.phone as patient_phone,
                CONCAT(du.first_name, ' ', du.last_name) as doctor_name,
                s.name as specialty_name,
                c.name as clinic_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            JOIN specialties s ON d.specialty_id = s.id
            JOIN clinics c ON a.clinic_id = c.id
            WHERE ${whereClause}
            ORDER BY a.appointment_time ASC
        `;

        const appointments = await executeQuery(appointmentsQuery, queryParams);

        res.json({
            success: true,
            message: 'Turnos de hoy obtenidos exitosamente',
            data: appointments
        });

    } catch (error) {
        console.error('Error obteniendo turnos de hoy:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de turnos
const getAppointmentStats = async (req, res) => {
    try {
        const { period = 'month', clinicId = '', doctorId = '' } = req.query;
        
        let dateFilter = '';
        switch (period) {
            case 'today':
                dateFilter = 'a.appointment_date = CURDATE()';
                break;
            case 'week':
                dateFilter = 'a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)';
                break;
            case 'month':
                dateFilter = 'a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
                break;
            case 'year':
                dateFilter = 'a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
                break;
            default:
                dateFilter = 'a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)';
        }

        let whereClause = dateFilter;
        let queryParams = [];

        if (clinicId) {
            whereClause += ' AND a.clinic_id = ?';
            queryParams.push(clinicId);
        }

        if (doctorId) {
            whereClause += ' AND a.doctor_id = ?';
            queryParams.push(doctorId);
        }

        const statsQuery = `
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_show,
                COUNT(CASE WHEN appointment_date = CURDATE() THEN 1 END) as today,
                COUNT(CASE WHEN appointment_date > CURDATE() THEN 1 END) as upcoming
            FROM appointments a
            WHERE ${whereClause}
        `;

        const stats = await executeQuery(statsQuery, queryParams);

        // Estadísticas por día (últimos 7 días)
        const dailyStatsQuery = `
            SELECT 
                DATE(a.appointment_date) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM appointments a
            WHERE a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ${clinicId ? 'AND a.clinic_id = ?' : ''}
            ${doctorId ? 'AND a.doctor_id = ?' : ''}
            GROUP BY DATE(a.appointment_date)
            ORDER BY date DESC
        `;

        const dailyQueryParams = [];
        if (clinicId) dailyQueryParams.push(clinicId);
        if (doctorId) dailyQueryParams.push(doctorId);

        const dailyStats = await executeQuery(dailyStatsQuery, dailyQueryParams);

        res.json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: {
                summary: stats[0],
                daily_stats: dailyStats,
                period: period
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Confirmar turno
const confirmAppointment = async (req, res) => {
    try {
        const { id } = req.params;

        const existingAppointment = await executeQuery(
            'SELECT * FROM appointments WHERE id = ?',
            [id]
        );

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = existingAppointment[0];

        if (appointment.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden confirmar turnos programados'
            });
        }

        const updated = await update('appointments', id, { status: 'confirmed' });

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo confirmar el turno'
            });
        }

        res.json({
            success: true,
            message: 'Turno confirmado exitosamente'
        });

    } catch (error) {
        console.error('Error confirmando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Completar turno
const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const existingAppointment = await executeQuery(
            'SELECT * FROM appointments WHERE id = ?',
            [id]
        );

        if (existingAppointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const appointment = existingAppointment[0];

        if (!['scheduled', 'confirmed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden completar turnos programados o confirmados'
            });
        }

        const updateData = { 
            status: 'completed'
        };

        if (notes) {
            updateData.notes = appointment.notes ? `${appointment.notes}\n\nNotas finales: ${notes}` : notes;
        }

        const updated = await update('appointments', id, updateData);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo completar el turno'
            });
        }

        res.json({
            success: true,
            message: 'Turno completado exitosamente'
        });

    } catch (error) {
        console.error('Error completando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    deleteAppointment,
    getDoctorAvailability,
    getTodayAppointments,
    getAppointmentStats,
    confirmAppointment,
    completeAppointment
};