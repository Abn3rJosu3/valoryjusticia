-- 1. Tabla para mensajes del formulario de contacto
CREATE TABLE contactos (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL,
    telefono VARCHAR2(20) NOT NULL,
    email VARCHAR2(100) NOT NULL,
    area VARCHAR2(50) NOT NULL,
    mensaje VARCHAR2(2000) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Tabla para credenciales de abogados/usuarios
CREATE TABLE abogados (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Insertar usuario inicial para pruebas de inicio de sesión
INSERT INTO abogados (nombre, email, password_hash)
VALUES ('Dr. Carlos Mendoza', 'abogado@valoryjusticia.com', '123456');

-- Confirmar cambios en la base de datos
COMMIT;

select * from contactos
select * from abogados