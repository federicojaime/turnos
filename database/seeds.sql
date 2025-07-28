-- Datos de prueba para el sistema de turnos
USE turnos_online;

-- Insertar usuarios (contraseñas hasheadas con bcrypt)
-- Contraseña: admin123 -> $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBcU1b5TXvd.mS
-- Contraseña: doctor123 -> $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Contraseña: patient123 -> $2a$12$2XvQHK1YBs1uLtHWkVpOYO8k6RG4g8iQVg2nJ7lCW9J2pIFQ3GRjK

INSERT INTO users (email, password, first_name, last_name, role, phone) VALUES
('admin@turnos.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBcU1b5TXvd.mS', 'Admin', 'Sistema', 'admin', '+5491112345678'),
('secretaria@clinica1.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'María', 'García', 'secretary', '+5491112345679'),
('dr.martinez@clinica1.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carlos', 'Martínez', 'secretary', '+5491112345680'),
('dr.lopez@clinica1.com', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'López', 'secretary', '+5491112345681'),
('paciente1@email.com', '$2a$12$2XvQHK1YBs1uLtHWkVpOYO8k6RG4g8iQVg2nJ7lCW9J2pIFQ3GRjK', 'Juan', 'Pérez', 'patient', '+5491112345682'),
('paciente2@email.com', '$2a$12$2XvQHK1YBs1uLtHWkVpOYO8k6RG4g8iQVg2nJ7lCW9J2pIFQ3GRjK', 'Laura', 'González', 'patient', '+5491112345683'),
('paciente3@email.com', '$2a$12$2XvQHK1YBs1uLtHWkVpOYO8k6RG4g8iQVg2nJ7lCW9J2pIFQ3GRjK', 'Roberto', 'Silva', 'patient', '+5491112345684');

-- Insertar clínicas
INSERT INTO clinics (name, address, phone, email, city, state, postal_code, opening_hours) VALUES
('Clínica Central', 'Av. Corrientes 1234, CABA', '+54114567890', 'info@clinicacentral.com', 'Buenos Aires', 'CABA', '1043', 
 '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "17:00"}}'),
('Sanatorio del Norte', 'Av. Cabildo 2500, CABA', '+54114567891', 'contacto@sanatorionorte.com', 'Buenos Aires', 'CABA', '1428', 
 '{"monday": {"start": "07:00", "end": "19:00"}, "tuesday": {"start": "07:00", "end": "19:00"}, "wednesday": {"start": "07:00", "end": "19:00"}, "thursday": {"start": "07:00", "end": "19:00"}, "friday": {"start": "07:00", "end": "18:00"}}'),
('Centro Médico Palermo', 'Av. Santa Fe 3000, CABA', '+54114567892', 'info@centropalermo.com', 'Buenos Aires', 'CABA', '1425', 
 '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "16:00"}}');

-- Insertar especialidades médicas
INSERT INTO specialties (name, description) VALUES
('Cardiología', 'Especialidad médica que se encarga del estudio, diagnóstico y tratamiento de las enfermedades del corazón y del aparato circulatorio'),
('Dermatología', 'Especialidad médica que se encarga del estudio de la estructura y función de la piel'),
('Neurología', 'Especialidad médica que trata los trastornos del sistema nervioso'),
('Pediatría', 'Especialidad médica que estudia al niño y sus enfermedades'),
('Ginecología', 'Especialidad médica que trata las enfermedades del sistema reproductor femenino'),
('Traumatología', 'Especialidad médica que se dedica al estudio de las lesiones del aparato locomotor'),
('Oftalmología', 'Especialidad médica que estudia las enfermedades de los ojos'),
('Psiquiatría', 'Especialidad médica dedicada al estudio de los trastornos mentales'),
('Medicina General', 'Atención médica integral y continua del paciente');

-- Insertar médicos
INSERT INTO doctors (user_id, clinic_id, specialty_id, license_number, consultation_duration) VALUES
(3, 1, 1, 'MP123456', 30),  -- Dr. Martínez, Cardiólogo en Clínica Central
(4, 1, 2, 'MP123457', 30);  -- Dra. López, Dermatóloga en Clínica Central

-- Insertar pacientes
INSERT INTO patients (user_id, birth_date, gender, blood_type, medical_history, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number) VALUES
(5, '1985-03-15', 'M', 'O+', 'Sin antecedentes relevantes', 'María Pérez', '+5491112345690', 'OSDE', '123456789'),
(6, '1990-07-22', 'F', 'A+', 'Alergia a penicilina', 'Carlos González', '+5491112345691', 'Swiss Medical', '987654321'),
(7, '1978-11-08', 'M', 'B-', 'Hipertensión controlada', 'Ana Silva', '+5491112345692', 'Galeno', '456789123');

-- Asociar secretaria con clínica
INSERT INTO clinic_users (clinic_id, user_id) VALUES
(1, 2);  -- María García (secretaria) trabaja en Clínica Central

-- Insertar horarios para los médicos
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active) VALUES
-- Dr. Martínez (Cardiólogo) - Lunes a Viernes
(1, 1, '08:00:00', '12:00:00', TRUE),  -- Lunes mañana
(1, 1, '14:00:00', '18:00:00', TRUE),  -- Lunes tarde
(1, 2, '08:00:00', '12:00:00', TRUE),  -- Martes mañana
(1, 2, '14:00:00', '18:00:00', TRUE),  -- Martes tarde
(1, 3, '08:00:00', '12:00:00', TRUE),  -- Miércoles mañana
(1, 3, '14:00:00', '18:00:00', TRUE),  -- Miércoles tarde
(1, 4, '08:00:00', '12:00:00', TRUE),  -- Jueves mañana
(1, 4, '14:00:00', '18:00:00', TRUE),  -- Jueves tarde
(1, 5, '08:00:00', '16:00:00', TRUE),  -- Viernes

-- Dra. López (Dermatóloga) - Lunes, Miércoles, Viernes
(2, 1, '09:00:00', '13:00:00', TRUE),  -- Lunes mañana
(2, 1, '15:00:00', '18:00:00', TRUE),  -- Lunes tarde
(2, 3, '09:00:00', '13:00:00', TRUE),  -- Miércoles mañana
(2, 3, '15:00:00', '18:00:00', TRUE),  -- Miércoles tarde
(2, 5, '09:00:00', '17:00:00', TRUE);  -- Viernes

-- Insertar algunos turnos de ejemplo
INSERT INTO appointments (patient_id, doctor_id, clinic_id, appointment_date, appointment_time, status, reason, notes, duration, created_by) VALUES
(1, 1, 1, '2024-03-15', '09:00:00', 'scheduled', 'Control cardiológico rutinario', 'Paciente en ayunas', 30, 2),
(2, 2, 1, '2024-03-15', '10:00:00', 'confirmed', 'Consulta dermatológica', 'Revisión de lunares', 30, 2),
(3, 1, 1, '2024-03-16', '14:30:00', 'scheduled', 'Control de presión arterial', '', 30, 2),
(1, 2, 1, '2024-03-18', '15:30:00', 'scheduled', 'Consulta dermatológica', 'Primera consulta', 30, 2);

-- Insertar historial de cambios en turnos
INSERT INTO appointment_history (appointment_id, previous_status, new_status, change_reason, changed_by) VALUES
(2, 'scheduled', 'confirmed', 'Confirmación telefónica del paciente', 2);

-- Verificación de datos insertados
SELECT 'Usuarios creados:' as info, COUNT(*) as cantidad FROM users;
SELECT 'Clínicas creadas:' as info, COUNT(*) as cantidad FROM clinics;
SELECT 'Especialidades creadas:' as info, COUNT(*) as cantidad FROM specialties;
SELECT 'Médicos creados:' as info, COUNT(*) as cantidad FROM doctors;
SELECT 'Pacientes creados:' as info, COUNT(*) as cantidad FROM patients;
SELECT 'Turnos creados:' as info, COUNT(*) as cantidad FROM appointments;
SELECT 'Horarios de médicos:' as info, COUNT(*) as cantidad FROM doctor_schedules;