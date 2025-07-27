const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'turnos_online',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a la base de datos establecida correctamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        return false;
    }
};

// Función helper para ejecutar queries
const executeQuery = async (query, params = []) => {
    try {
        const [results] = await pool.execute(query, params);
        return results;
    } catch (error) {
        console.error('Error ejecutando query:', error.message);
        throw error;
    }
};

// Función helper para transacciones
const executeTransaction = async (queries) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (let query of queries) {
            const [result] = await connection.execute(query.sql, query.params || []);
            results.push(result);
        }
        
        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Función para obtener un registro por ID
const findById = async (table, id, fields = '*') => {
    const query = `SELECT ${fields} FROM ${table} WHERE id = ? AND is_active = 1`;
    const results = await executeQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
};

// Función para obtener todos los registros con paginación
const findAll = async (table, options = {}) => {
    const {
        page = 1,
        limit = 10,
        orderBy = 'id',
        orderDir = 'ASC',
        where = '',
        fields = '*'
    } = options;
    
    const offset = (page - 1) * limit;
    let query = `SELECT ${fields} FROM ${table}`;
    
    if (where) {
        query += ` WHERE ${where}`;
    } else {
        query += ` WHERE is_active = 1`;
    }
    
    query += ` ORDER BY ${orderBy} ${orderDir} LIMIT ${limit} OFFSET ${offset}`;
    
    const results = await executeQuery(query);
    
    // Contar total de registros
    let countQuery = `SELECT COUNT(*) as total FROM ${table}`;
    if (where) {
        countQuery += ` WHERE ${where}`;
    } else {
        countQuery += ` WHERE is_active = 1`;
    }
    
    const countResult = await executeQuery(countQuery);
    const total = countResult[0].total;
    
    return {
        data: results,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Función para crear un registro
const create = async (table, data) => {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
    const result = await executeQuery(query, values);
    
    return result.insertId;
};

// Función para actualizar un registro
const update = async (table, id, data) => {
    const fields = Object.keys(data).map(field => `${field} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const query = `UPDATE ${table} SET ${fields} WHERE id = ?`;
    const result = await executeQuery(query, values);
    
    return result.affectedRows > 0;
};

// Función para eliminar (soft delete)
const softDelete = async (table, id) => {
    const query = `UPDATE ${table} SET is_active = 0 WHERE id = ?`;
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
};

// Probar conexión al inicializar
testConnection();

module.exports = {
    pool,
    executeQuery,
    executeTransaction,
    findById,
    findAll,
    create,
    update,
    softDelete,
    testConnection
};