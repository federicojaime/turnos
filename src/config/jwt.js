const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generar token JWT
const generateToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'turnos-online-api',
            audience: 'turnos-online-app'
        });
    } catch (error) {
        throw new Error('Error generando token JWT: ' + error.message);
    }
};

// Verificar token JWT
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'turnos-online-api',
            audience: 'turnos-online-app'
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expirado');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Token inválido');
        } else {
            throw new Error('Error verificando token: ' + error.message);
        }
    }
};

// Decodificar token sin verificar (útil para debug)
const decodeToken = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (error) {
        throw new Error('Error decodificando token: ' + error.message);
    }
};

// Generar refresh token (válido por más tiempo)
const generateRefreshToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: '7d', // 7 días
            issuer: 'turnos-online-api',
            audience: 'turnos-online-refresh'
        });
    } catch (error) {
        throw new Error('Error generando refresh token: ' + error.message);
    }
};

// Verificar refresh token
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'turnos-online-api',
            audience: 'turnos-online-refresh'
        });
    } catch (error) {
        throw new Error('Refresh token inválido o expirado');
    }
};

// Extraer token del header Authorization
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) {
        throw new Error('Header Authorization no encontrado');
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new Error('Formato de token inválido. Use: Bearer <token>');
    }
    
    return parts[1];
};

// Crear payload estándar para JWT
const createTokenPayload = (user) => {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active
    };
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
    generateRefreshToken,
    verifyRefreshToken,
    extractTokenFromHeader,
    createTokenPayload,
    JWT_SECRET,
    JWT_EXPIRES_IN
};