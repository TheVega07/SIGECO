from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import decimal

app = Flask(__name__)
# Habilitar CORS para permitir que la web se comunique con la API sin bloqueos
CORS(app)

# ==========================================
# CONEXIÓN A LA BASE DE DATOS EN LA NUBE
# ==========================================
def obtener_conexion():
    return mysql.connector.connect(
        host="bofka0yvxs4omirhgxov-mysql.services.clever-cloud.com",
        user="uqhndfmb7n4qeitj",
        password="pCgS8AdKvbLpLdCSpvqK",
        database="bofka0yvxs4omirhgxov",
        port=3306
    )

# Función auxiliar para evitar errores con los números decimales en formato JSON
def convertir_decimales(filas):
    for fila in filas:
        for clave, valor in fila.items():
            if isinstance(valor, decimal.Decimal):
                fila[clave] = float(valor)
    return filas

# ==========================================
# RUTAS DE LA API (Endpoints)
# ==========================================

# 1. LOGIN DE USUARIOS
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE username=%s AND password=%s", (username, password))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if user:
        if user['estado'] != 'ACTIVO':
            return jsonify({'exito': False, 'mensaje': 'Tu cuenta está inactiva. Contacta al administrador.'})
        
        # Eliminamos la contraseña del JSON por seguridad antes de enviarlo
        del user['password']
        return jsonify({'exito': True, 'usuario': convertir_decimales([user])[0]})
        
    return jsonify({'exito': False, 'mensaje': 'Usuario o contraseña incorrectos.'})

# 2. OBTENER TODOS LOS DATOS PARA LOS DASHBOARDS
@app.route('/api/datos', methods=['GET'])
def obtener_datos():
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    
    # Traemos usuarios (sin la contraseña)
    cursor.execute("SELECT id, username, nombre, rol, curso, valor_total_pagar, estado, debe_cambiar_clave FROM usuarios")
    usuarios = convertir_decimales(cursor.fetchall())
    
    # Traemos pagos
    cursor.execute("SELECT * FROM pagos ORDER BY fecha DESC")
    pagos = convertir_decimales(cursor.fetchall())
    
    # Traemos documentos (renombrando columnas para coincidir con tu script.js)
    cursor.execute("SELECT id, tipo, fecha, descripcion as 'desc', proveedor as prov, valor, archivoNombre, visible FROM documentos ORDER BY fecha DESC")
    contratos = convertir_decimales(cursor.fetchall())
    
    cursor.close()
    conn.close()
    
    # Devolvemos la estructura exacta que espera script.js
    return jsonify({
        'usuarios': usuarios,
        'pagos': pagos,
        'ingresos': [], # Listos para uso futuro
        'egresos': [],  # Listos para uso futuro
        'contratos': contratos
    })

# 3. SEGURIDAD: FORZAR CAMBIO DE CONTRASEÑA
@app.route('/api/usuarios/clave', methods=['POST'])
def actualizar_clave():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET password=%s, debe_cambiar_clave=%s WHERE username=%s", 
                   (data['password'], data['forzar'], data['username']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 4. GESTIÓN DE USUARIOS (CREAR Y EDITAR)
@app.route('/api/usuarios', methods=['POST', 'PUT'])
def guardar_usuario():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    if request.method == 'POST':
        cursor.execute("INSERT INTO usuarios (username, nombre, rol, curso, password) VALUES (%s, %s, %s, %s, %s)",
                       (data['username'], data['nombre'], data['rol'], data['curso'], data['password']))
    else: # PUT (Modificar)
        cursor.execute("UPDATE usuarios SET nombre=%s, rol=%s, curso=%s WHERE username=%s",
                       (data['nombre'], data['rol'], data['curso'], data['username']))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 5. ACTIVAR / DESACTIVAR USUARIO
@app.route('/api/usuarios/estado', methods=['POST'])
def cambiar_estado():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET estado=%s WHERE username=%s", (data['estado'], data['username']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 6. ASIGNAR/MODIFICAR CUOTA DEL PADRE
@app.route('/api/usuarios/cuota', methods=['POST'])
def cambiar_cuota():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("UPDATE usuarios SET valor_total_pagar=%s WHERE username=%s", (data['valor'], data['username']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 7. REGISTRAR PAGO (DESDE EL MODAL)
@app.route('/api/pagos', methods=['POST'])
def registrar_pago():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    
    # Validamos que el usuario exista
    cursor.execute("SELECT username FROM usuarios WHERE username=%s", (data['usuario'],))
    if not cursor.fetchone():
        return jsonify({'exito': False, 'mensaje': 'El usuario seleccionado no existe.'})

    cursor.execute("INSERT INTO pagos (usuario, fecha, voucher, valor) VALUES (%s, %s, %s, %s)",
                   (data['usuario'], data['fecha'], data['voucher'], data['valor']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 8. APROBAR PAGO (ADMIN)
@app.route('/api/pagos/validar', methods=['POST'])
def validar_pago():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("UPDATE pagos SET estado='VALIDADO' WHERE id=%s", (data['id'],))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 9. SUBIR DOCUMENTOS Y CONTRATOS
@app.route('/api/documentos', methods=['POST'])
def subir_documento():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO documentos (tipo, fecha, descripcion, proveedor, valor, archivoNombre, archivoData, visible) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                   (data.get('tipo', 'CONTRATO'), data['fecha'], data['desc'], data.get('prov', ''), data.get('valor', 0), data['archivoNombre'], data['archivoData'], data.get('visible', 0)))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 10. CAMBIAR VISIBILIDAD DE DOCUMENTO
@app.route('/api/documentos/visible', methods=['POST'])
def doc_visible():
    data = request.json
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("UPDATE documentos SET visible=%s WHERE id=%s", (data['visible'], data['id']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'exito': True})

# 11. VER DOCUMENTO PDF (Traer el Base64)
@app.route('/api/documentos/ver/<int:id>', methods=['GET'])
def ver_documento(id):
    conn = obtener_conexion()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT archivoData FROM documentos WHERE id=%s", (id,))
    doc = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if doc:
        return jsonify({'exito': True, 'base64': doc['archivoData']})
    return jsonify({'exito': False})

# ==========================================
# INICIAR SERVIDOR EN PUERTO 3000
# ==========================================
if __name__ == '__main__':
    print("Iniciando servidor SIGECO conectado a Clever Cloud...")
    # Corremos en puerto 3000 porque así está configurado script.js
    app.run(port=3000, debug=True)