from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

# Destructor de caché estricto para Vercel
@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

db_config = {
    'host': 'bofka0yvxs4omirhgxov-mysql.services.clever-cloud.com',
    'user': 'uqhndfmb7n4qeitj',
    'password': 'pCgS8AdKvbLpLdCSpvqK',
    'database': 'bofka0yvxs4omirhgxov',
    'port': 3306
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        usuario = data.get('username')
        password = data.get('password')

        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE username = %s AND password = %s", (usuario, password))
        user = cursor.fetchone()
        cursor.close()
        conexion.close()

        if user:
            if user.get('estado') == 'INACTIVO':
                return jsonify({"exito": False, "mensaje": "Usuario inactivo. Contacte al administrador."})
            return jsonify({"exito": True, "mensaje": "Login exitoso", "usuario": user})
        else:
            return jsonify({"exito": False, "mensaje": "Credenciales incorrectas"}), 401
    except Exception as e:
        return jsonify({"exito": False, "error": str(e)}), 500

@app.route('/api/datos', methods=['GET'])
def obtener_datos():
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        
        # ⚠️ IMPORTANTE: No extraemos los LONGTEXT aquí para que Vercel no colapse. Solo verificamos si existen.
        cursor.execute("SELECT username, nombre, rol, curso, estado, valor_total_pagar, debe_cambiar_clave FROM usuarios")
        usuarios = cursor.fetchall()
        
        cursor.execute("SELECT id, usuario, fecha, voucher, valor, estado, CASE WHEN LENGTH(voucher_b64) > 10 THEN 1 ELSE 0 END as tiene_voucher FROM pagos")
        pagos = cursor.fetchall()
        
        try:
            cursor.execute("SELECT * FROM ingresos")
            ingresos = cursor.fetchall()
        except:
            ingresos = []
            
        cursor.execute("SELECT id, fecha, descripcion, proveedor, valor, CASE WHEN LENGTH(archivoData) > 10 THEN 1 ELSE 0 END as tiene_doc FROM egresos")
        egresos = cursor.fetchall()
        
        cursor.execute("SELECT id, tipo, fecha, `desc`, prov, valor, visible, CASE WHEN LENGTH(archivoData) > 10 THEN 1 ELSE 0 END as tiene_doc FROM documentos")
        contratos = cursor.fetchall()
        
        cursor.execute("SELECT id, fecha, descripcion, archivoNombre, CASE WHEN LENGTH(archivoData) > 10 THEN 1 ELSE 0 END as tiene_doc FROM actas")
        actas = cursor.fetchall()

        cursor.close()
        conexion.close()

        return jsonify({
            "usuarios": usuarios, 
            "pagos": pagos, 
            "ingresos": ingresos, 
            "egresos": egresos, 
            "contratos": contratos,
            "actas": actas
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# RUTAS DE USUARIOS
# ==========================================
@app.route('/api/usuarios', methods=['POST', 'PUT'])
def guardar_usuario():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        if request.method == 'POST':
            sql = "INSERT INTO usuarios (username, nombre, rol, curso, password, estado, valor_total_pagar, debe_cambiar_clave) VALUES (%s, %s, %s, %s, %s, 'ACTIVO', 0, 1)"
            val = (data['username'], data['nombre'], data['rol'], data['curso'], data['password'])
        else:
            sql = "UPDATE usuarios SET nombre=%s, rol=%s, curso=%s WHERE username=%s"
            val = (data['nombre'], data['rol'], data['curso'], data['username'])
            
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/usuarios/estado', methods=['POST'])
def estado_usuario():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET estado=%s WHERE username=%s", (data['estado'], data['username']))
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/usuarios/clave', methods=['POST'])
def clave_usuario():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET password=%s, debe_cambiar_clave=%s WHERE username=%s", (data['password'], data['forzar'], data['username']))
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/usuarios/cuota', methods=['POST'])
def cuota_usuario():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET valor_total_pagar=%s WHERE username=%s", (data['valor'], data['username']))
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

# ==========================================
# RUTAS DE PAGOS Y DOCUMENTOS
# ==========================================
@app.route('/api/pagos', methods=['POST'])
def registrar_pago():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO pagos (usuario, fecha, voucher, valor, estado, voucher_b64) VALUES (%s, %s, %s, %s, 'PENDIENTE', %s)"
        val = (data['usuario'], data['fecha'], data['voucher'], data['valor'], data.get('voucher_b64', ''))
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/pagos/validar', methods=['POST'])
def validar_pago():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE pagos SET estado = 'VALIDADO' WHERE id = %s", (data['id'],))
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/documentos', methods=['POST'])
def subir_documento():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO documentos (tipo, fecha, `desc`, prov, valor, archivoNombre, archivoData, visible) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        val = (data['tipo'], data['fecha'], data['desc'], data['prov'], data['valor'], data['archivoNombre'], data['archivoData'], data['visible'])
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/documentos/visible', methods=['POST'])
def visible_documento():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE documentos SET visible=%s WHERE id=%s", (data['visible'], data['id']))
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/documentos/ver/<int:id>', methods=['GET'])
def ver_documento(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT archivoData FROM documentos WHERE id = %s", (id,))
        doc = cursor.fetchone()
        cursor.close()
        conexion.close()
        if doc and doc['archivoData']:
            return jsonify({"exito": True, "base64": doc['archivoData']})
        return jsonify({"exito": False, "mensaje": "No encontrado"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/pagos/ver/<int:id>', methods=['GET'])
def ver_voucher(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT voucher_b64 FROM pagos WHERE id = %s", (id,))
        doc = cursor.fetchone()
        cursor.close()
        conexion.close()
        if doc and doc['voucher_b64']:
            return jsonify({"exito": True, "base64": doc['voucher_b64']})
        return jsonify({"exito": False, "mensaje": "No encontrado"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/egresos', methods=['POST'])
def registrar_egreso():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO egresos (fecha, descripcion, proveedor, valor, archivoNombre, archivoData) VALUES (%s, %s, %s, %s, %s, %s)"
        val = (data['fecha'], data['descripcion'], data['proveedor'], data['valor'], data.get('archivoNombre', ''), data.get('archivoData', ''))
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/egresos/ver/<int:id>', methods=['GET'])
def ver_egreso(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT archivoData FROM egresos WHERE id = %s", (id,))
        doc = cursor.fetchone()
        cursor.close()
        conexion.close()
        if doc and doc['archivoData']:
            return jsonify({"exito": True, "base64": doc['archivoData']})
        return jsonify({"exito": False, "mensaje": "No encontrado"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/actas', methods=['POST'])
def subir_acta():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO actas (fecha, descripcion, archivoNombre, archivoData) VALUES (%s, %s, %s, %s)"
        val = (data['fecha'], data['descripcion'], data['archivoNombre'], data['archivoData'])
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/actas/ver/<int:id>', methods=['GET'])
def ver_acta(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT archivoData FROM actas WHERE id = %s", (id,))
        doc = cursor.fetchone()
        cursor.close()
        conexion.close()
        if doc and doc['archivoData']:
            return jsonify({"exito": True, "base64": doc['archivoData']})
        return jsonify({"exito": False, "mensaje": "No encontrado"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})

@app.route('/api/dashboard/curso', methods=['GET'])
def dashboard_curso():
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        sql = """
            SELECT u.curso, SUM(p.valor) as total_recaudado 
            FROM pagos p 
            INNER JOIN usuarios u ON p.usuario = u.username 
            WHERE p.estado = 'VALIDADO' 
            GROUP BY u.curso
        """
        cursor.execute(sql)
        recaudado_curso = cursor.fetchall()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True, "datos": recaudado_curso})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})