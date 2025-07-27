const bcrypt = require('bcryptjs');
const { executeQuery, findById } = require('../config/database');
const { generateToken, generateRefreshToken, createTokenPayload, verifyRefreshToken } = require('../config/jwt');
const { validationResult } = require('express-validator');

// Login de usuario
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Buscar usuario por email
        const userQuery = `
            SELECT id, email, password, first_name, last_name, role, phone, is_active 
            FROM users 
            WHERE email = ? AND is_active = 1
        `;
        const users = await executeQuery(userQuery, [email]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generar tokens
        const tokenPayload = createTokenPayload(user);
        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Obtener información adicional según el rol
        let additionalInfo = {};
        
        if (user.role === 'patient') {
            const patientQuery = `
                SELECT id, birth_date, gender, medical_history 
                FROM patients 
                WHERE user_id = ? AND is_active = 1
            `;
            const patients = await executeQuery(patientQuery, [user.id]);
            if (patients.length > 0) {
                additionalInfo.patientId = patients[0].id;
                additionalInfo.birthDate = patients[0].birth_date;
                additionalInfo.gender = patients[0].gender;
            }
        } else if (user.role === 'secretary') {
            const clinicsQuery = `
                SELECT c.id, c.name 
                FROM clinic_users cu
                JOIN clinics c ON cu.clinic_id = c.id
                WHERE cu.user_id = ? AND cu.is_active = 1 AND c.is_active = 1
            `;
            const clinics = await executeQuery(clinicsQuery, [user.id]);
            additionalInfo.clinics = clinics;
        }

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    phone: user.phone,
                    ...additionalInfo
                },
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Registro de nuevo usuario (solo admin puede crear usuarios)
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const { email, password, firstName, lastName, role, phone } = req.body;

        // Verificar si el email ya existe
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const insertQuery = `
            INSERT INTO users (email, password, first_name, last_name, role, phone) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await executeQuery(insertQuery, [
            email,
            hashedPassword,
            firstName,
            lastName,
            role || 'patient',
            phone
        ]);

        const userId = result.insertId;

        // Si es paciente, crear registro en tabla patients
        if (role === 'patient') {
            await executeQuery(
                'INSERT INTO patients (user_id) VALUES (?)',
                [userId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: userId,
                email,
                firstName,
                lastName,
                role: role || 'patient'
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Refresh token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token requerido'
            });
        }

        const decoded = verifyRefreshToken(refreshToken);
        const user = await findById('users', decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const tokenPayload = createTokenPayload(user);
        const newAccessToken = generateToken(tokenPayload);

        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                accessToken: newAccessToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        });

    } catch (error) {
        console.error('Error renovando token:', error);
        res.status(401).json({
            success: false,
            message: 'Refresh token inválido o expirado'
        });
    }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userQuery = `
            SELECT id, email, first_name, last_name, role, phone, created_at, updated_at
            FROM users 
            WHERE id = ? AND is_active = 1
        `;
        const users = await executeQuery(userQuery, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = users[0];
        let profileData = { ...user };

        if (user.role === 'patient') {
            const patientQuery = `
                SELECT id, birth_date, gender, blood_type, medical_history,
                       emergency_contact_name, emergency_contact_phone,
                       insurance_provider, insurance_number
                FROM patients 
                WHERE user_id = ? AND is_active = 1
            `;
            const patients = await executeQuery(patientQuery, [userId]);
            if (patients.length > 0) {
                profileData.patientData = patients[0];
            }
        } else if (user.role === 'secretary') {
            const clinicsQuery = `
                SELECT c.id, c.name, c.address, c.phone, c.city
                FROM clinic_users cu
                JOIN clinics c ON cu.clinic_id = c.id
                WHERE cu.user_id = ? AND cu.is_active = 1 AND c.is_active = 1
            `;
            const clinics = await executeQuery(clinicsQuery, [userId]);
            profileData.clinics = clinics;
        }

        res.json({
            success: true,
            message: 'Perfil obtenido exitosamente',
            data: profileData
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Actualizar perfil del usuario
const updateProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { firstName, lastName, phone } = req.body;

        const updateQuery = `
            UPDATE users 
            SET first_name = ?, last_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        await executeQuery(updateQuery, [firstName, lastName, phone, userId]);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const userQuery = 'SELECT password FROM users WHERE id = ?';
        const users = await executeQuery(userQuery, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        await executeQuery(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const verifyToken = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Token válido',
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = {
    login,
    register,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    verifyToken
};