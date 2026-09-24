let usuariosBD = [], pagosGlobales = [], ingresosGlobales = [], egresosGlobales = [];
let contratosGlobales = [], actasGlobales = [], cotizacionesGlobales = [];
let usuarioActual = null;

const API_URL = "/api"; 

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('vista-login').classList.remove('oculto');

    if (document.getElementById('form-login')) document.getElementById('form-login').addEventListener('submit', iniciarSesion);
    if (document.getElementById('form-forzar-clave')) document.getElementById('form-forzar-clave').addEventListener('submit', guardarClaveForzada);
    if (document.getElementById('form-usuario')) document.getElementById('form-usuario').addEventListener('submit', guardarUsuario);
    if (document.getElementById('form-pago')) document.getElementById('form-pago').addEventListener('submit', registrarPago);
    if (document.getElementById('form-cuota')) document.getElementById('form-cuota').addEventListener('submit', guardarNuevaCuota);
    if (document.getElementById('form-contrato')) document.getElementById('form-contrato').addEventListener('submit', (e) => subirDocumento(e, 'CONTRATO'));
    if (document.getElementById('form-egreso')) document.getElementById('form-egreso').addEventListener('submit', registrarEgreso);
    if (document.getElementById('form-acta')) document.getElementById('form-acta').addEventListener('submit', subirActa);

    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function(e) {
            const feedbackEl = document.getElementById('feedback-' + this.id);
            if (feedbackEl) {
                if (this.files.length > 0) {
                    feedbackEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Archivo adjuntado: <strong>${this.files[0].name}</strong>`;
                    feedbackEl.classList.remove('oculto');
                    this.classList.add('is-valid');
                    this.style.borderColor = '#198754';
                } else {
                    feedbackEl.classList.add('oculto');
                    this.classList.remove('is-valid');
                    this.style.borderColor = '#ced4da';
                }
            }
        });
    });
});

function limpiarFeedbackArchivos() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = "";
        input.classList.remove('is-valid');
        input.style.borderColor = '#ced4da';
        const feedbackEl = document.getElementById('feedback-' + input.id);
        if (feedbackEl) feedbackEl.classList.add('oculto');
    });
}

function mostrarAlerta(mensaje, icono = '✅') {
    const alertaIcono = document.getElementById('alerta-icono');
    const alertaMensaje = document.getElementById('alerta-mensaje');
    const modalElement = document.getElementById('modalAlertaSistema');
    
    if (alertaIcono && alertaMensaje && modalElement) {
        alertaIcono.innerText = icono;
        alertaMensaje.innerText = mensaje;
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
    } else {
        alert(icono + " " + mensaje);
    }
}

async function cargarDatosDesdeServidor() {
    try {
        const urlSinCache = `${API_URL}/datos?t=${new Date().getTime()}`;
        const resp = await fetch(urlSinCache);
        if (!resp.ok) throw new Error("Error en el servidor");
        const data = await resp.json();
        usuariosBD = data.usuarios || []; 
        pagosGlobales = data.pagos || [];
        ingresosGlobales = data.ingresos || []; 
        egresosGlobales = data.egresos || [];
        contratosGlobales = data.contratos || [];
        actasGlobales = data.actas || [];
    } catch (e) {
        console.error(e);
        mostrarAlerta("Error al descargar la información de la base de datos.", "❌");
    }
}

async function iniciarSesion(e) {
    e.preventDefault();
    try {
        const resp = await fetch(`${API_URL}/login`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: document.getElementById('username').value.trim(), 
                password: document.getElementById('password').value 
            })
        });
        const data = await resp.json();

        if (data.exito) {
            await cargarDatosDesdeServidor();
            if(data.usuario.debe_cambiar_clave === 1) {
                usuarioActual = data.usuario;
                document.getElementById('vista-login').classList.add('oculto');
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalForzarClave')).show();
            } else {
                cargarPortalSegunRol(data.usuario);
            }
        } else {
            const errDiv = document.getElementById('mensaje-error');
            if(errDiv) {
                errDiv.classList.remove('oculto'); 
                errDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${data.mensaje}`;
            }
        }
    } catch (error) { 
        mostrarAlerta("Error de conexión con el servidor en la nube.", "❌"); 
    }
}

async function guardarClaveForzada(e) {
    e.preventDefault();
    const nuevaClave = document.getElementById('nueva-clave-forzada').value;
    const resp = await fetch(`${API_URL}/usuarios/clave`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuarioActual.username, password: nuevaClave, forzar: 0 })
    });
    const data = await resp.json();
    if(resp.ok && data.exito){
        usuarioActual.debe_cambiar_clave = 0;
        bootstrap.Modal.getInstance(document.getElementById('modalForzarClave')).hide();
        document.getElementById('form-forzar-clave').reset();
        mostrarAlerta('Contraseña actualizada con éxito.', '🔐');
        cargarPortalSegunRol(usuarioActual);
    } else {
        mostrarAlerta("Error al cambiar contraseña.", "❌");
    }
}

function cargarPortalSegunRol(usuario) {
    usuarioActual = usuario;
    const errDiv = document.getElementById('mensaje-error');
    if(errDiv) errDiv.classList.add('oculto');
    
    document.getElementById('vista-login').classList.add('oculto');
    document.getElementById('vista-app').style.display = '';
    document.getElementById('vista-app').classList.remove('oculto');
    
    document.getElementById('nav-nombre-usuario').innerText = usuario.nombre;
    document.getElementById('badge-rol').innerText = usuario.rol;

    if (usuario.rol === 'ADMIN' || usuario.rol === 'COMITE') {
        let menuHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarModuloAdmin('resumen', this)"><i class="bi bi-grid-1x2-fill me-2"></i> Resumen General</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('curso', this)"><i class="bi bi-bar-chart-fill me-2"></i> Resumen por Curso</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('pagos', this)"><i class="bi bi-journal-check me-2"></i> Control de Pagos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('egresos', this)"><i class="bi bi-cart-fill me-2"></i> Egresos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('contratos', this)"><i class="bi bi-file-earmark-text-fill me-2"></i> Contratos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('actas', this)"><i class="bi bi-briefcase-fill me-2"></i> Actas de Comité</a></li>
        `;
        if (usuario.rol === 'ADMIN') {
            menuHTML += `
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('usuarios', this)"><i class="bi bi-people-fill me-2"></i> Usuarios</a></li>
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('cuotas', this)"><i class="bi bi-wallet2 me-2"></i> Cuotas</a></li>
            `;
        }
        document.getElementById('menu-navegacion').innerHTML = menuHTML;
        document.getElementById('portal-admin').classList.remove('oculto');
        if(document.getElementById('portal-padre')) document.getElementById('portal-padre').classList.add('oculto');
        
        renderizarTodasLasTablasAdmin();
        renderizarDashboardCurso();
    } else {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-2"></i> Estado de Cuenta</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open-fill me-2"></i> Documentos</a></li>
        `;
        document.getElementById('portal-padre').classList.remove('oculto');
        document.getElementById('portal-admin').classList.add('oculto');
        actualizarDashboardPadre();
    }
}

function cerrarSesion() {
    usuarioActual = null;
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('vista-login').classList.remove('oculto');
    document.getElementById('form-login').reset();
}

function cerrarMenuMobile() {
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('.navbar-collapse');
    if (collapse && collapse.classList.contains('show')) toggler.click();
}

function cambiarModuloAdmin(modulo, el) {
    document.querySelectorAll('#portal-admin > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    const div = document.getElementById(`admin-modulo-${modulo}`);
    if (div) div.classList.remove('oculto');
    if (el) el.classList.add('active');
    cerrarMenuMobile();
}

function cambiarVistaPadre(vista, el) {
    document.querySelectorAll('#portal-padre > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    const div = document.getElementById(`padre-vista-${vista}`);
    if (div) div.classList.remove('oculto');
    if(el) el.classList.add('active');
    cerrarMenuMobile();
}

async function renderizarTodasLasTablasAdmin() {
    await cargarDatosDesdeServidor();
    renderizarDashboardAdmin();
    renderizarUsuarios();
    
    const selectPadres = document.getElementById('pago-usuario');
    if(selectPadres) {
        selectPadres.innerHTML = '<option value="">-- Seleccione un padre --</option>';
        usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
            selectPadres.innerHTML += `<option value="${u.username}">${u.nombre} (${u.username})</option>`;
        });
    }

    const tp = document.getElementById('tabla-pagos'); 
    if(tp) {
        tp.innerHTML = '';
        pagosGlobales.forEach(p => {
            const datosUsuario = usuariosBD.find(u => u.username === p.usuario);
            const nombreCompleto = datosUsuario ? datosUsuario.nombre : 'Usuario Desconocido';
            const btnVoucher = p.tiene_voucher ? `<button class="btn btn-sm btn-info text-white fw-bold ms-2 shadow-sm" onclick="abrirVoucher(${p.id})"><i class="bi bi-image me-1"></i>Voucher</button>` : '';

            tp.innerHTML += `<tr>
                <td class="fw-bold text-dark text-start">${nombreCompleto}</td>
                <td class="text-primary fw-bold">${p.usuario}</td>
                <td>${p.fecha}</td>
                <td>${p.voucher} ${btnVoucher}</td>
                <td class="fw-bold text-success">$${parseFloat(p.valor || 0).toFixed(2)}</td>
                <td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'} px-2 py-1">${p.estado}</span></td>
                <td>${p.estado==='PENDIENTE'?`<button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="validarPago(${p.id})"><i class="bi bi-check2 me-1"></i>Aprobar</button>`:'<i class="bi bi-check-circle-fill text-success fs-5"></i>'}</td>
            </tr>`;
        });
    }
    
    const te = document.getElementById('tabla-egresos');
    if(te) {
        te.innerHTML = '';
        if(egresosGlobales.length === 0) te.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay egresos registrados.</td></tr>`;
        egresosGlobales.forEach(e => {
            const btnDoc = e.tiene_doc ? `<button class="btn btn-sm btn-outline-danger fw-bold shadow-sm" onclick="verEgresoPDF(${e.id})"><i class="bi bi-file-pdf-fill me-1"></i>Factura</button>` : '-';
            te.innerHTML += `<tr><td>${e.fecha}</td><td class="fw-bold text-dark">${e.descripcion}</td><td>${e.proveedor}</td><td class="fw-bold text-danger">-$${parseFloat(e.valor || 0).toFixed(2)}</td><td>${btnDoc}</td></tr>`;
        });
    }

    const ta = document.getElementById('tabla-actas');
    if(ta) {
        ta.innerHTML = '';
        if(actasGlobales.length === 0) ta.innerHTML = `<tr><td colspan="3" class="text-muted py-4">No hay actas registradas.</td></tr>`;
        actasGlobales.forEach(a => {
            const btnDoc = a.tiene_doc ? `<button class="btn btn-sm btn-dark fw-bold shadow-sm" onclick="verActaPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Abrir Acta</button>` : '-';
            ta.innerHTML += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion}</td><td>${btnDoc}</td></tr>`;
        });
    }

    const tc = document.getElementById('tabla-cuotas'); 
    if(tc) {
        tc.innerHTML = '';
        usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
            tc.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td class="fw-bold text-dark">$${parseFloat(u.valor_total_pagar || 0).toFixed(2)}</td><td><button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="abrirModalCuota('${u.username}', ${parseFloat(u.valor_total_pagar || 0)})"><i class="bi bi-pencil-fill me-1"></i>Modificar</button></td></tr>`;
        });
    }
    
    const tbDocs = document.getElementById('tabla-contratos'); 
    if(tbDocs) {
        tbDocs.innerHTML = '';
        if (contratosGlobales.length === 0) tbDocs.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay contratos registrados.</td></tr>`;
        contratosGlobales.forEach(c => {
            const descripcionC = c.desc || c.descripcion || '';
            const proveedorC = c.prov || c.proveedor || '';
            const btnVisible = `<div class="form-check form-switch d-flex justify-content-center"><input class="form-check-input" type="checkbox" ${c.visible?'checked':''} onchange="toggleVisibleDoc(${c.id}, this.checked)"></div>`;
            tbDocs.innerHTML += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${descripcionC}</td><td>${proveedorC}</td><td class="fw-bold text-success">$${parseFloat(c.valor || 0).toFixed(2)}</td><td>${btnVisible}</td></tr>`;
        });
    }
}

function renderizarDashboardAdmin() {
    let pagosValidados = pagosGlobales.filter(p => p.estado === 'VALIDADO').reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    let totalIngresos = ingresosGlobales.reduce((s, i) => s + parseFloat(i.valor || 0), 0) + pagosValidados;
    let totalEgresos = egresosGlobales.reduce((s, e) => s + parseFloat(e.valor || 0), 0);
    
    if(document.getElementById('dash-ingresos')) document.getElementById('dash-ingresos').innerText = `$${totalIngresos.toFixed(2)}`;
    if(document.getElementById('dash-egresos')) document.getElementById('dash-egresos').innerText = `$${totalEgresos.toFixed(2)}`;
    if(document.getElementById('dash-saldo')) document.getElementById('dash-saldo').innerText = `$${(totalIngresos - totalEgresos).toFixed(2)}`;
}

async function renderizarDashboardCurso() {
    try {
        const urlSinCache = `${API_URL}/dashboard/curso?t=${new Date().getTime()}`;
        const resp = await fetch(urlSinCache);
        const data = await resp.json();
        if(data.exito) {
            const tc = document.getElementById('tabla-dashboard-curso');
            if(tc) {
                tc.innerHTML = '';
                if(data.datos.length === 0) tc.innerHTML = `<tr><td colspan="2" class="text-muted py-4">Aún no hay recaudaciones por curso.</td></tr>`;
                data.datos.forEach(d => {
                    tc.innerHTML += `<tr>
                        <td class="fw-bold" style="color: #1e3c72;">${d.curso || 'Sin asignar'}</td>
                        <td class="fw-bold text-success fs-5">$${parseFloat(d.total_recaudado || 0).toFixed(2)}</td>
                    </tr>`;
                });
            }
        }
    } catch (e) {
        console.error("Error cargando dashboard", e);
    }
}

function actualizarDashboardPadre() {
    cargarDatosDesdeServidor().then(() => {
        const userDatos = usuariosBD.find(u => u.username === usuarioActual.username);
        const misPagos = pagosGlobales.filter(p => p.usuario === usuarioActual.username);
        
        let totalPagado = misPagos.filter(p => p.estado === 'VALIDADO').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
        let pendiente = parseFloat(userDatos.valor_total_pagar || 0) - totalPagado;

        if(document.getElementById('lbl-total-pagar')) document.getElementById('lbl-total-pagar').innerText = `$${parseFloat(userDatos.valor_total_pagar || 0).toFixed(2)}`;
        if(document.getElementById('lbl-pagado')) document.getElementById('lbl-pagado').innerText = `$${totalPagado.toFixed(2)}`;
        if(document.getElementById('lbl-pendiente')) document.getElementById('lbl-pendiente').innerText = `$${pendiente.toFixed(2)}`;

        const tb = document.getElementById('tabla-pagos-padre'); 
        if(tb) {
            tb.innerHTML = '';
            if(misPagos.length === 0) tb.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay transferencias registradas.</td></tr>`;
            misPagos.forEach(p => {
                tb.innerHTML += `<tr><td>${p.fecha}</td><td class="fw-bold">${p.voucher}</td><td class="text-success fw-bold">$${parseFloat(p.valor || 0).toFixed(2)}</td><td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'} px-2 py-1">${p.estado}</span></td></tr>`;
            });
        }

        const tbd = document.getElementById('tabla-docs-padre'); 
        if(tbd) {
            tbd.innerHTML = '';
            const docsVisibles = contratosGlobales.filter(c => c.visible);
            if(docsVisibles.length === 0) tbd.innerHTML = `<tr><td colspan="3" class="text-muted py-4">No hay documentos públicos habilitados.</td></tr>`;
            docsVisibles.forEach(c => {
                const descripcionC = c.desc || c.descripcion || '';
                tbd.innerHTML += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${descripcionC}</td><td><button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="verDocumentoPDF(${c.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver PDF</button></td></tr>`;
            });
        }
    });
}

// ==========================================================
// FUNCIÓN INFALIBLE PARA ABRIR PDFS E IMÁGENES
// ==========================================================
function abrirBase64EnNuevaPestana(base64Data) {
    if(!base64Data || base64Data.length < 20) {
        mostrarAlerta("El documento está vacío o no se guardó correctamente.", "❌");
        return;
    }
    // Aseguramos que tenga el formato correcto para que el navegador lo entienda
    if (!base64Data.startsWith('data:')) {
        base64Data = 'data:application/pdf;base64,' + base64Data;
    }
    const newWindow = window.open("");
    if (newWindow) {
        newWindow.document.write(`<iframe width='100%' height='100%' style='border:none; margin:0; padding:0;' src='${base64Data}'></iframe>`);
        newWindow.document.close();
    } else {
        mostrarAlerta("Tu navegador bloqueó la ventana. Por favor, permite las ventanas emergentes (pop-ups) en la barra de direcciones.", "⚠️");
    }
}

// === FUNCIONES DE LECTURA DE ARCHIVOS ===
function leerArchivoComoBase64(file) { 
    return new Promise((res, rej) => { 
        const reader = new FileReader(); 
        reader.onload = () => res(reader.result); 
        reader.onerror = rej; 
        reader.readAsDataURL(file); 
    }); 
}

async function abrirVoucher(id) {
    const urlSinCache = `${API_URL}/pagos/ver/${id}?t=${new Date().getTime()}`;
    const resp = await fetch(urlSinCache);
    const data = await resp.json();
    if(data.exito && data.base64) abrirBase64EnNuevaPestana(data.base64);
    else mostrarAlerta("Voucher no encontrado o corrupto.", "❌");
}

async function verDocumentoPDF(id) { 
    const urlSinCache = `${API_URL}/documentos/ver/${id}?t=${new Date().getTime()}`;
    const resp = await fetch(urlSinCache); 
    const data = await resp.json(); 
    if(data.exito && data.base64) abrirBase64EnNuevaPestana(data.base64);
    else mostrarAlerta("Documento no encontrado o corrupto.", "❌"); 
}

async function verActaPDF(id) { 
    const urlSinCache = `${API_URL}/actas/ver/${id}?t=${new Date().getTime()}`;
    const resp = await fetch(urlSinCache); 
    const data = await resp.json(); 
    if(data.exito && data.base64) abrirBase64EnNuevaPestana(data.base64);
    else mostrarAlerta("Acta no encontrada.", "❌"); 
}

async function verEgresoPDF(id) { 
    const urlSinCache = `${API_URL}/egresos/ver/${id}?t=${new Date().getTime()}`;
    const resp = await fetch(urlSinCache); 
    const data = await resp.json(); 
    if(data.exito && data.base64) abrirBase64EnNuevaPestana(data.base64);
    else mostrarAlerta("Factura de egreso no encontrada.", "❌"); 
}

// === FUNCIONES DE REGISTRO (CRUD) CON VALIDACIÓN ESTRICTA ===
async function registrarPago(e) { 
    e.preventDefault(); 
    const fileInput = document.getElementById('pago-voucher-file');
    let voucherB64 = "";
    if(fileInput && fileInput.files.length > 0) voucherB64 = await leerArchivoComoBase64(fileInput.files[0]);

    const p = { 
        usuario: document.getElementById('pago-usuario').value, 
        fecha: document.getElementById('pago-fecha').value, 
        voucher: document.getElementById('pago-voucher').value, 
        valor: parseFloat(document.getElementById('pago-valor').value),
        voucher_b64: voucherB64
    }; 
    
    try {
        const resp = await fetch(`${API_URL}/pagos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); 
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalPago')).hide(); 
            document.getElementById('form-pago').reset(); 
            limpiarFeedbackArchivos();
            mostrarAlerta("Pago registrado exitosamente.", "✅"); 
            renderizarTodasLasTablasAdmin(); 
        } else {
            mostrarAlerta("Error al guardar en la base de datos: " + data.mensaje, "❌");
        }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function registrarEgreso(e) {
    e.preventDefault();
    const file = document.getElementById('egreso-file').files[0];
    let b64 = "", fileName = "";
    if(file) { b64 = await leerArchivoComoBase64(file); fileName = file.name; }

    const p = {
        fecha: document.getElementById('egreso-fecha').value,
        descripcion: document.getElementById('egreso-desc').value,
        proveedor: document.getElementById('egreso-prov').value,
        valor: parseFloat(document.getElementById('egreso-valor').value),
        archivoNombre: fileName,
        archivoData: b64
    };
    
    try {
        const resp = await fetch(`${API_URL}/egresos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalEgreso')).hide();
            document.getElementById('form-egreso').reset();
            limpiarFeedbackArchivos();
            mostrarAlerta("Egreso registrado correctamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al registrar egreso: " + data.mensaje, "❌");
        }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function subirActa(e) {
    e.preventDefault();
    const file = document.getElementById('acta-file').files[0];
    if(!file) { mostrarAlerta("Por favor, selecciona un documento PDF.", "⚠️"); return; }
    
    const b64 = await leerArchivoComoBase64(file);
    const p = {
        fecha: document.getElementById('acta-fecha').value,
        descripcion: document.getElementById('acta-desc').value,
        archivoNombre: file.name,
        archivoData: b64
    };
    
    try {
        const resp = await fetch(`${API_URL}/actas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalActa')).hide();
            document.getElementById('form-acta').reset();
            limpiarFeedbackArchivos();
            mostrarAlerta("Acta subida y guardada correctamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al subir acta: " + data.mensaje, "❌");
        }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

function abrirModalUsuario(username = null) {
    const form = document.getElementById('form-usuario');
    if(username) {
        const u = usuariosBD.find(x => x.username === username);
        document.getElementById('usu-modo').value = "EDITAR"; 
        document.getElementById('usu-id').value = u.username; 
        document.getElementById('usu-id').readOnly = true;
        document.getElementById('usu-nombre').value = u.nombre; 
        document.getElementById('usu-rol').value = u.rol; 
        document.getElementById('usu-curso').value = u.curso;
        document.getElementById('div-usu-clave').classList.add('oculto'); 
        document.getElementById('usu-clave').required = false; 
        document.getElementById('titulo-modal-usuario').innerText = "Modificar Usuario";
    } else {
        form.reset(); 
        document.getElementById('usu-modo').value = "CREAR"; 
        document.getElementById('usu-id').readOnly = false;
        document.getElementById('div-usu-clave').classList.remove('oculto'); 
        document.getElementById('usu-clave').required = true; 
        document.getElementById('titulo-modal-usuario').innerText = "Nuevo Usuario";
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario')).show();
}

async function guardarUsuario(e) {
    e.preventDefault();
    const payload = { 
        username: document.getElementById('usu-id').value.trim(), 
        nombre: document.getElementById('usu-nombre').value, 
        rol: document.getElementById('usu-rol').value, 
        curso: document.getElementById('usu-curso').value, 
        password: document.getElementById('usu-clave').value 
    };
    
    try {
        const method = document.getElementById('usu-modo').value === "CREAR" ? 'POST' : 'PUT';
        const resp = await fetch(`${API_URL}/usuarios`, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
            mostrarAlerta("Usuario guardado en la base de datos.", "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al guardar usuario: " + data.mensaje, "❌");
        }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function toggleEstadoUsuario(username) {
    const u = usuariosBD.find(x => x.username === username);
    const nuevoEstado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await fetch(`${API_URL}/usuarios/estado`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, estado: nuevoEstado }) });
    renderizarTodasLasTablasAdmin();
}

function renderizarUsuarios() {
    const tb = document.getElementById('tabla-usuarios-admin'); 
    if(!tb) return;
    tb.innerHTML = '';
    usuariosBD.forEach(u => {
        let btnSt = u.estado === "ACTIVO" 
            ? `<button class="btn btn-sm btn-outline-danger fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-x-circle-fill me-1"></i>Desactivar</button>` 
            : `<button class="btn btn-sm btn-success fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-check-circle-fill me-1"></i>Activar</button>`;
            
        tb.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td><span class="badge bg-primary px-2">${u.rol}</span></td><td>${u.curso||'-'}</td><td><span class="badge ${u.estado==='ACTIVO'?'bg-success':'bg-secondary'} px-2 py-1">${u.estado}</span></td><td><div class="d-flex flex-column flex-md-row justify-content-center align-items-center"><button class="btn btn-sm btn-primary fw-bold me-md-1 shadow-sm" onclick="abrirModalUsuario('${u.username}')"><i class="bi bi-pencil-fill me-1"></i>Editar</button>${btnSt}</div></td></tr>`;
    });
}

async function validarPago(id) { 
    await fetch(`${API_URL}/pagos/validar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) }); 
    mostrarAlerta("Transferencia aprobada.", "✅"); 
    renderizarTodasLasTablasAdmin(); 
}

function abrirModalCuota(user, val) { 
    document.getElementById('cuota-usu').value = user; 
    document.getElementById('nueva-cuota-input').value = parseFloat(val).toFixed(2); 
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAsignarCuota')).show(); 
}

async function guardarNuevaCuota(e) { 
    e.preventDefault(); 
    await fetch(`${API_URL}/usuarios/cuota`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('cuota-usu').value, valor: parseFloat(document.getElementById('nueva-cuota-input').value) }) }); 
    bootstrap.Modal.getInstance(document.getElementById('modalAsignarCuota')).hide(); 
    mostrarAlerta("Cuota actualizada.", "✅"); 
    renderizarTodasLasTablasAdmin(); 
}

async function subirDocumento(e, tipo) { 
    e.preventDefault(); 
    const file = document.getElementById('ctr-file').files[0]; 
    if(!file) { mostrarAlerta("Por favor, selecciona un documento.", "⚠️"); return; }
    const b64 = await leerArchivoComoBase64(file); 
    const p = { 
        tipo: tipo, 
        fecha: document.getElementById('ctr-fecha').value, 
        desc: document.getElementById('ctr-desc').value, 
        prov: document.getElementById('ctr-prov').value, 
        valor: parseFloat(document.getElementById('ctr-valor').value), 
        archivoNombre: file.name, 
        archivoData: b64, 
        visible: document.getElementById('ctr-visible').checked ? 1 : 0 
    }; 
    try {
        const resp = await fetch(`${API_URL}/documentos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); 
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide(); 
            document.getElementById('form-contrato').reset(); 
            limpiarFeedbackArchivos();
            mostrarAlerta("Contrato subido y guardado exitosamente.", "✅"); 
            renderizarTodasLasTablasAdmin(); 
        } else {
            mostrarAlerta("Error al guardar: " + data.mensaje, "❌");
        }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function toggleVisibleDoc(id, val) { 
    await fetch(`${API_URL}/documentos/visible`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, visible: val ? 1 : 0 }) }); 
    renderizarTodasLasTablasAdmin(); 
}