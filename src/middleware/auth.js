const { verifyToken, extractTokenFromHeader } = require('../config/jwt');
const { findById } = require('../config/database');

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);
        
        // Verificar y decodificar el token
        const decoded = verifyToken(token);
        
        // Verificar que el usuario aún existe y está activo
        const user = await findById('users', decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }
        
        // Agregar información del usuario a la request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            isActive: user.is_active
        };
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Token de acceso inválido'
        });
    }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Acceso no autorizado'
            });
        }
        
        // Convertir a array si es un string
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`
            });
        }
        
        next();
    };
};

// Middleware para verificar si es admin
const requireAdmin = requireRole('admin');

// Middleware para verificar si es admin o secretaria
const requireStaff = requireRole(['admin', 'secretary']);

// Middleware para verificar acceso a clínica específica
const requireClinicAccess = async (req, res, next) => {
    try {
        const { clinicId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Admin tiene acceso a todas las clínicas
        if (userRole === 'admin') {
            return next();
        }
        
        // Verificar si el usuario tiene acceso a esta clínica
        const { executeQuery } = require('../config/database');
        
        if (userRole === 'secretary') {
            // Verificar en clinic_users
            const accessQuery = `
                SELECT 1 FROM clinic_users 
                WHERE user_id = ? AND clinic_id = ? AND is_active = 1
            `;
            const access = await executeQuery(accessQuery, [userId, clinicId]);
            
            if (access.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes acceso a esta clínica'
                });
            }
        } else if (userRole === 'patient') {
            // Los pacientes solo pueden ver sus propios datos
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado para pacientes'
            });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verificando acceso a clínica'
        });
    }
};

// Middleware para verificar acceso a médico específico
const requireDoctorAccess = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Admin tiene acceso a todos los médicos
        if (userRole === 'admin') {
            return next();
        }
        
        const { executeQuery } = require('../config/database');
        
        if (userRole === 'secretary') {
            // Verificar si la secretaria tiene acceso a la clínica del médico
            const accessQuery = `
                SELECT cu.id FROM clinic_users cu
                JOIN doctors d ON cu.clinic_id = d.clinic_id
                WHERE cu.user_id = ? AND d.id = ? AND cu.is_active = 1 AND d.is_active = 1
            `;
            const access = await executeQuery(accessQuery, [userId, doctorId]);
            
            if (access.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes acceso a este médico'
                });
            }
        } else {
            // Otros roles no tienen acceso directo a médicos
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado'
            });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verificando acceso a médico'
        });
    }
};

// Middleware para verificar acceso a paciente (solo sus propios datos)
const requirePatientAccess = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Admin y secretarias tienen acceso
        if (['admin', 'secretary'].includes(userRole)) {
            return next();
        }
        
        // Pacientes solo pueden acceder a sus propios datos
        if (userRole === 'patient') {
            const { executeQuery } = require('../config/database');
            const patientQuery = `
                SELECT id FROM patients 
                WHERE id = ? AND user_id = ? AND is_active = 1
            `;
            const patient = await executeQuery(patientQuery, [patientId, userId]);
            
            if (patient.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo puedes acceder a tus propios datos'
                });
            }
        }
        
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verificando acceso a paciente'
        });
    }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }
        
        const token = extractTokenFromHeader(authHeader);
        const decoded = verifyToken(token);
        
        const user = await findById('users', decoded.id);
        if (user) {
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                isActive: user.is_active
            };
        }
        
        next();
    } catch (error) {
        // Si hay error con el token, continúa sin usuario
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireStaff,
    requireClinicAccess,
    requireDoctorAccess,
    requirePatientAccess,
    optionalAuth
};