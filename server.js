const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para que Oracle devuelva los resultados como Objetos en lugar de Arreglos
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// Configuración para que las transacciones hagan COMMIT automático
oracledb.autoCommit = true;

// Configuración de credenciales para Oracle DB
const dbConfig = {
    user: process.env.DB_USER || 'SYSTEM',
    password: process.env.DB_PASSWORD || 'oracle',
    connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// 1. RUTA: INICIO DE SESIÓN DE ABOGADOS (POST /api/login)
// =========================================================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Por favor, ingresa correo y contraseña.' 
        });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `SELECT ID, NOMBRE, EMAIL, PASSWORD_HASH 
                     FROM ABOGADOS 
                     WHERE LOWER(EMAIL) = LOWER(:email)`;
                     
        const result = await connection.execute(sql, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Correo o contraseña incorrectos.' 
            });
        }

        const abogado = result.rows[0];
        const dbPassword = abogado.PASSWORD_HASH;

        if (dbPassword !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Correo o contraseña incorrectos.' 
            });
        }

        return res.json({
            success: true,
            message: 'Autenticación exitosa.',
            user: {
                id: abogado.ID,
                nombre: abogado.NOMBRE,
                email: abogado.EMAIL
            }
        });

    } catch (err) {
        console.error('Error durante el inicio de sesión:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno en el servidor.' 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión:', err);
            }
        }
    }
});

// =========================================================================
// 2. RUTA: FORMULARIO DE CONTACTO / CONSULTAS (POST /api/contacto)
// =========================================================================
app.post('/api/contacto', async (req, res) => {
    const { nombre, telefono, email, area, mensaje } = req.body;

    if (!nombre || !telefono || !email || !area || !mensaje) {
        return res.status(400).json({ 
            success: false, 
            message: 'Todos los campos son obligatorios.' 
        });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `INSERT INTO CONTACTOS (NOMBRE, TELEFONO, EMAIL, AREA, MENSAJE, FECHA_REGISTRO) 
                     VALUES (:nombre, :telefono, :email, :area, :mensaje, SYSDATE)`;

        await connection.execute(sql, { nombre, telefono, email, area, mensaje });

        return res.json({ 
            success: true, 
            message: 'Solicitud guardada correctamente.' 
        });

    } catch (err) {
        console.error('Error guardando mensaje de contacto:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al registrar la solicitud en la base de datos.' 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión:', err);
            }
        }
    }
});

// =========================================================================
// 3. RUTA: OBTENER LISTA DE CONTACTOS (GET /api/contactos)
// =========================================================================
app.get('/api/contactos', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `SELECT ID, 
                            TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD HH24:MI') AS FECHA, 
                            NOMBRE, 
                            TELEFONO, 
                            EMAIL, 
                            AREA, 
                            MENSAJE 
                     FROM CONTACTOS 
                     ORDER BY ID DESC`;

        const result = await connection.execute(sql);

        const contactos = result.rows.map(row => ({
            id: row.ID,
            fecha: row.FECHA,
            nombre: row.NOMBRE,
            telefono: row.TELEFONO,
            email: row.EMAIL,
            area: row.AREA,
            mensaje: row.MENSAJE
        }));

        return res.json({
            success: true,
            data: contactos
        });

    } catch (err) {
        console.error('Error al obtener contactos:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al consultar la base de datos.' 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión:', err);
            }
        }
    }
});

// =========================================================================
// 4. RUTAS DE EXPEDIENTES (GET y POST /api/expedientes)
// =========================================================================
app.get('/api/expedientes', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT ID, NUMERO_EXPEDIENTE, CLIENTE, ABOGADO_RESPONSABLE, ESTADO, DESCRIPCION, 
             TO_CHAR(FECHA_CREACION, 'YYYY-MM-DD HH24:MI') AS FECHA 
             FROM EXPEDIENTES ORDER BY ID DESC`
        );
        
        const expedientes = result.rows.map(row => ({
            id: row.ID,
            numeroExpediente: row.NUMERO_EXPEDIENTE,
            cliente: row.CLIENTE,
            abogadoResponsable: row.ABOGADO_RESPONSABLE,
            estado: row.ESTADO,
            descripcion: row.DESCRIPCION,
            fecha: row.FECHA
        }));

        return res.json({ success: true, data: expedientes });
    } catch (err) {
        console.error('Error al consultar expedientes:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
});

app.post('/api/expedientes', async (req, res) => {
    const { numeroExpediente, cliente, abogadoResponsable, estado, descripcion, idContacto } = req.body;
    
    if (!numeroExpediente || !cliente || !abogadoResponsable) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        await connection.execute(
            `INSERT INTO EXPEDIENTES (NUMERO_EXPEDIENTE, CLIENTE, ABOGADO_RESPONSABLE, ESTADO, DESCRIPCION, ID_CONTACTO) 
             VALUES (:numeroExpediente, :cliente, :abogadoResponsable, :estado, :descripcion, :idContacto)`,
            [numeroExpediente, cliente, abogadoResponsable, estado || 'En Trámite', descripcion, idContacto || null]
        );
        return res.json({ success: true, message: 'Expediente creado exitosamente.' });
    } catch (err) {
        console.error('Error al guardar expediente:', err);
        return res.status(500).json({ success: false, message: 'Error al registrar el expediente en la base de datos.' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (err) { console.error(err); }
        }
    }
});

// =========================================================================
// 5. COMODÍN / RUTA POR DEFECTO (DEBE IR SIEMPRE HASTA EL FINAL ANTES DEL LISTEN)
// =========================================================================
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado correctamente en http://localhost:${PORT}`);
});