const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sistema de Turnos Online API',
            version: '1.0.0',
            description: `
                API completa para gestión de turnos médicos online.
                
                ## Características principales:
                - 🏥 Gestión de clínicas, médicos y pacientes
                - 📅 Sistema de turnos con validación de disponibilidad
                - 🔐 Autenticación JWT con roles (admin, secretary, patient)
                - 📊 Estadísticas y reportes
                - 🔍 Búsqueda y filtros avanzados
                
                ## Roles de usuario:
                - **Admin**: Acceso completo al sistema
                - **Secretary**: Gestión de turnos y pacientes de su clínica
                - **Patient**: Ver y gestionar sus propios turnos
                
                ## Autenticación:
                Use el endpoint /api/auth/login para obtener el token de acceso.
                Luego incluya el token en el header: Authorization: Bearer <token>
            `,
            contact: {
                name: 'API Support',
                email: 'support@turnos-online.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            },
            {
                url: 'https://api.turnos-online.com',
                description: 'Servidor de producción'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT obtenido del endpoint /api/auth/login'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Mensaje de error'
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operación exitosa'
                        },
                        data: {
                            type: 'object'
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            example: 1
                        },
                        limit: {
                            type: 'integer',
                            example: 10
                        },
                        total: {
                            type: 'integer',
                            example: 100
                        },
                        pages: {
                            type: 'integer',
                            example: 10
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'usuario@ejemplo.com'
                        },
                        firstName: {
                            type: 'string',
                            example: 'Juan'
                        },
                        lastName: {
                            type: 'string',
                            example: 'Pérez'
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'secretary', 'patient'],
                            example: 'patient'
                        },
                        phone: {
                            type: 'string',
                            example: '+54911234567'
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        }
                    }
                },
                Clinic: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        name: {
                            type: 'string',
                            example: 'Clínica Central'
                        },
                        address: {
                            type: 'string',
                            example: 'Av. Corrientes 1234, CABA'
                        },
                        phone: {
                            type: 'string',
                            example: '+54114567890'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'info@clinica.com'
                        },
                        city: {
                            type: 'string',
                            example: 'Buenos Aires'
                        },
                        state: {
                            type: 'string',
                            example: 'CABA'
                        },
                        postalCode: {
                            type: 'string',
                            example: '1010'
                        },
                        openingHours: {
                            type: 'object',
                            example: {
                                monday: { start: "08:00", end: "18:00" },
                                tuesday: { start: "08:00", end: "18:00" }
                            }
                        }
                    }
                },
                Doctor: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        userId: {
                            type: 'integer',
                            example: 2
                        },
                        clinicId: {
                            type: 'integer',
                            example: 1
                        },
                        specialtyId: {
                            type: 'integer',
                            example: 1
                        },
                        licenseNumber: {
                            type: 'string',
                            example: 'MP123456'
                        },
                        consultationDuration: {
                            type: 'integer',
                            example: 30,
                            description: 'Duración en minutos'
                        }
                    }
                },
                Patient: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        userId: {
                            type: 'integer',
                            example: 3
                        },
                        birthDate: {
                            type: 'string',
                            format: 'date',
                            example: '1990-05-15'
                        },
                        gender: {
                            type: 'string',
                            enum: ['M', 'F', 'Other'],
                            example: 'M'
                        },
                        bloodType: {
                            type: 'string',
                            example: 'O+'
                        },
                        medicalHistory: {
                            type: 'string',
                            example: 'Antecedentes de hipertensión'
                        },
                        emergencyContactName: {
                            type: 'string',
                            example: 'María Pérez'
                        },
                        emergencyContactPhone: {
                            type: 'string',
                            example: '+54911111111'
                        },
                        insuranceProvider: {
                            type: 'string',
                            example: 'OSDE'
                        },
                        insuranceNumber: {
                            type: 'string',
                            example: '123456789'
                        }
                    }
                },
                Appointment: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        patientId: {
                            type: 'integer',
                            example: 1
                        },
                        doctorId: {
                            type: 'integer',
                            example: 1
                        },
                        clinicId: {
                            type: 'integer',
                            example: 1
                        },
                        appointmentDate: {
                            type: 'string',
                            format: 'date',
                            example: '2024-03-15'
                        },
                        appointmentTime: {
                            type: 'string',
                            format: 'time',
                            example: '14:30'
                        },
                        status: {
                            type: 'string',
                            enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
                            example: 'scheduled'
                        },
                        reason: {
                            type: 'string',
                            example: 'Control médico rutinario'
                        },
                        notes: {
                            type: 'string',
                            example: 'Paciente en ayunas'
                        },
                        duration: {
                            type: 'integer',
                            example: 30,
                            description: 'Duración en minutos'
                        }
                    }
                },
                Specialty: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        name: {
                            type: 'string',
                            example: 'Cardiología'
                        },
                        description: {
                            type: 'string',
                            example: 'Especialidad médica que se encarga del corazón'
                        }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Token de acceso faltante o inválido',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Token de acceso inválido'
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Permisos insuficientes',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Acceso denegado'
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Recurso no encontrado'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Error de validación de datos',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Datos de entrada inválidos',
                                errors: [
                                    {
                                        field: 'email',
                                        message: 'Email válido requerido'
                                    }
                                ]
                            }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Error interno del servidor',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                message: 'Error interno del servidor'
                            }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Autenticación',
                description: 'Endpoints para login, registro y gestión de tokens'
            },
            {
                name: 'Clínicas',
                description: 'Gestión de clínicas médicas'
            },
            {
                name: 'Médicos',
                description: 'Gestión de médicos y especialidades'
            },
            {
                name: 'Pacientes',
                description: 'Gestión de pacientes'
            },
            {
                name: 'Turnos',
                description: 'Sistema de turnos y citas médicas'
            },
            {
                name: 'Especialidades',
                description: 'Gestión de especialidades médicas'
            },
            {
                name: 'Estadísticas',
                description: 'Reportes y estadísticas del sistema'
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js'
    ]
};

const specs = swaggerJSDoc(options);

module.exports = specs;