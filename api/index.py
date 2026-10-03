from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import datetime
from decimal import Decimal

app = Flask(__name__)
CORS(app)

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

def sanitize_row(row):
    if not row: return row
    for key, val in row.items():
        if isinstance(val, Decimal): row[key] = float(val)
        elif isinstance(val, (datetime.date, datetime.datetime)): row[key] = str(val)
        elif isinstance(val, bytes):
            try: row[key] = val.decode('utf-8')
            except: row[key] = ""
    return row

def sanitize_list(rows):
    if not rows: return []
    return [sanitize_row(r) for r in rows]

@app.route('/api/login', methods=['POST'])
def login():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE username = %s AND password = %s", (data.get('username'), data.get('password')))
        user = sanitize_row(cursor.fetchone())
        if user:
            if user.get('estado') == 'INACTIVO': return jsonify({"exito": False, "mensaje": "Usuario inactivo."})
            return jsonify({"exito": True, "usuario": user})
        else: return jsonify({"exito": False, "mensaje": "Credenciales incorrectas"}), 401
    except Exception as e: return jsonify({"exito": False, "error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/datos', methods=['GET'])
def obtener_datos():
    conexion, cursor = None, None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        resp_data = {"usuarios": [], "pagos": [], "ingresos": [], "egresos": [], "contratos": [], "actas": [], "actividades": []}
        
        try: cursor.execute("SELECT * FROM usuarios"); resp_data["usuarios"] = sanitize_list(cursor.fetchall())
        except: pass
        try: 
            cursor.execute("SELECT * FROM pagos")
            pagos = cursor.fetchall()
            for p in pagos: p['tiene_voucher'] = 1 if p.get('voucher_b64') else 0
            resp_data["pagos"] = sanitize_list(pagos)
        except: pass
        try:
            cursor.execute("SELECT * FROM egresos")
            egresos = cursor.fetchall()
            for e in egresos:
                e['tiene_doc'] = 1 if e.get('archivoData') else 0
                e.pop('archivoData', None)
            resp_data["egresos"] = sanitize_list(egresos)
        except: pass
        try:
            cursor.execute("SELECT * FROM documentos")
            docs = cursor.fetchall()
            for d in docs:
                d['tiene_doc'] = 1 if d.get('archivoData') else 0
                d.pop('archivoData', None)
            resp_data["contratos"] = sanitize_list(docs)
        except: pass
        try:
            cursor.execute("SELECT * FROM actas")
            actas = cursor.fetchall()
            for a in actas:
                a['tiene_doc'] = 1 if a.get('archivoData') else 0
                a.pop('archivoData', None)
            resp_data["actas"] = sanitize_list(actas)
        except: pass
        try:
            cursor.execute("SELECT * FROM actividades")
            acts = cursor.fetchall()
            for a in acts:
                a['tiene_doc'] = 1 if a.get('archivoData') else 0
                a.pop('archivoData', None)
            resp_data["actividades"] = sanitize_list(acts)
        except: pass

        return jsonify(resp_data)
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/usuarios', methods=['POST', 'PUT'])
def guardar_usuario():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        fiesta = data.get('asiste_fiesta', 'NO')
        adultos = data.get('adultos_fiesta', 0)
        ninos = data.get('ninos_fiesta', 0)
        if request.method == 'POST':
            sql = "INSERT INTO usuarios (username, nombre, rol, curso, password, estado, valor_total_pagar, debe_cambiar_clave, asiste_fiesta, adultos_fiesta, ninos_fiesta) VALUES (%s, %s, %s, %s, %s, 'ACTIVO', 0, 1, %s, %s, %s)"
            val = (data['username'], data['nombre'], data['rol'], data['curso'], data['password'], fiesta, adultos, ninos)
        else:
            sql = "UPDATE usuarios SET nombre=%s, rol=%s, curso=%s, asiste_fiesta=%s, adultos_fiesta=%s, ninos_fiesta=%s WHERE username=%s"
            val = (data['nombre'], data['rol'], data['curso'], fiesta, adultos, ninos, data['username'])
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/usuarios/fiesta/padre', methods=['POST'])
def actualizar_fiesta_padre():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        asiste = "SI" if (int(data['adultos']) > 0 or int(data['ninos']) > 0) else "NO"
        cursor.execute("UPDATE usuarios SET asiste_fiesta=%s, adultos_fiesta=%s, ninos_fiesta=%s WHERE username=%s", 
                       (asiste, data['adultos'], data['ninos'], data['username']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/usuarios/estado', methods=['POST'])
def estado_usuario():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET estado=%s WHERE username=%s", (data['estado'], data['username']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/usuarios/clave', methods=['POST'])
def clave_usuario():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET password=%s, debe_cambiar_clave=%s WHERE username=%s", (data['password'], data['forzar'], data['username']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/usuarios/cuota', methods=['POST'])
def cuota_usuario():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE usuarios SET valor_total_pagar=%s WHERE username=%s", (data['valor'], data['username']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/pagos', methods=['POST'])
def registrar_pago():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO pagos (usuario, fecha, voucher, valor, estado, voucher_b64) VALUES (%s, %s, %s, %s, 'PENDIENTE', %s)"
        val = (data['usuario'], data['fecha'], data['voucher'], data['valor'], data.get('voucher_b64', ''))
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/pagos/validar', methods=['POST'])
def validar_pago():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE pagos SET estado = 'VALIDADO' WHERE id = %s", (data['id'],))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/egresos', methods=['POST'])
def registrar_egreso():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO egresos (fecha, descripcion, proveedor, valor, archivoNombre, archivoData, estado_pago) VALUES (%s, %s, %s, %s, %s, %s, 'PENDIENTE')"
        val = (data['fecha'], data['descripcion'], data['proveedor'], data['valor'], data.get('archivoNombre', ''), data.get('archivoData', ''))
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/egresos/estado', methods=['POST'])
def estado_egreso():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE egresos SET estado_pago=%s WHERE id=%s", (data['estado'], data['id']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/egresos/<int:id>', methods=['DELETE'])
def eliminar_egreso(id):
    conexion, cursor = None, None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("DELETE FROM egresos WHERE id = %s", (id,))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/actividades', methods=['POST'])
def subir_actividad():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO actividades (curso, descripcion, fecha, valor, archivoNombre, archivoData) VALUES (%s, %s, %s, %s, %s, %s)"
        val = (data['curso'], data['descripcion'], data['fecha'], data['valor'], data['archivoNombre'], data['archivoData'])
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/actas', methods=['POST'])
def subir_acta():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO actas (fecha, descripcion, archivoNombre, archivoData) VALUES (%s, %s, %s, %s)"
        val = (data['fecha'], data['descripcion'], data['archivoNombre'], data['archivoData'])
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/documentos', methods=['POST'])
def subir_documento():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO documentos (tipo, fecha, descripcion, proveedor, valor, archivoNombre, archivoData, visible) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"
        val = (data['tipo'], data['fecha'], data['desc'], data['prov'], data['valor'], data['archivoNombre'], data['archivoData'], data['visible'])
        cursor.execute(sql, val)
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/documentos/visible', methods=['POST'])
def visible_documento():
    conexion, cursor = None, None
    try:
        data = request.get_json()
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("UPDATE documentos SET visible=%s WHERE id=%s", (data['visible'], data['id']))
        conexion.commit()
        return jsonify({"exito": True})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

# ======= RUTAS PARA DESCARGAR ARCHIVOS ========
def obtener_base64(tabla, campo, id):
    conexion, cursor = None, None
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(f"SELECT {campo} FROM {tabla} WHERE id = %s", (id,))
        doc = cursor.fetchone()
        if doc and doc[campo]: return jsonify({"exito": True, "base64": doc[campo]})
        return jsonify({"exito": False, "mensaje": "No encontrado"})
    except Exception as e: return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cursor: cursor.close()
        if conexion: conexion.close()

@app.route('/api/pagos/ver/<int:id>', methods=['GET'])
def ver_voucher(id): return obtener_base64('pagos', 'voucher_b64', id)
@app.route('/api/documentos/ver/<int:id>', methods=['GET'])
def ver_documento(id): return obtener_base64('documentos', 'archivoData', id)
@app.route('/api/actas/ver/<int:id>', methods=['GET'])
def ver_acta(id): return obtener_base64('actas', 'archivoData', id)
@app.route('/api/egresos/ver/<int:id>', methods=['GET'])
def ver_egreso(id): return obtener_base64('egresos', 'archivoData', id)
@app.route('/api/actividades/ver/<int:id>', methods=['GET'])
def ver_actividad(id): return obtener_base64('actividades', 'archivoData', id)

if __name__ == '__main__':
    app.run(debug=True)