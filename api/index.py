from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

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
        
        cursor.execute("SELECT * FROM usuarios")
        usuarios = cursor.fetchall()
        
        cursor.execute("SELECT * FROM pagos")
        pagos = cursor.fetchall()
        
        try:
            cursor.execute("SELECT * FROM ingresos")
            ingresos = cursor.fetchall()
        except:
            ingresos = []
            
        cursor.execute("SELECT * FROM egresos")
        egresos = cursor.fetchall()
        
        cursor.execute("SELECT * FROM documentos")
        contratos = cursor.fetchall()
        
        cursor.execute("SELECT * FROM actas")
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
        return jsonify({"exito": False, "error": str(e)})

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
        return jsonify({"exito": False, "error": str(e)})

@app.route('/api/egresos', methods=['POST'])
def registrar_egreso():
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO egresos (fecha, descripcion, proveedor, valor) VALUES (%s, %s, %s, %s)"
        val = (data['fecha'], data['descripcion'], data['proveedor'], data['valor'])
        cursor.execute(sql, val)
        conexion.commit()
        cursor.close()
        conexion.close()
        return jsonify({"exito": True})
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
        return jsonify({"exito": False, "error": str(e)})

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
        return jsonify({"exito": False, "error": str(e)})