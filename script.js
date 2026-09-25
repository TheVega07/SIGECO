let usuariosBD = [], pagosGlobales = [], ingresosGlobales = [], egresosGlobales = [];
let contratosGlobales = [], actasGlobales = [], actividadesGlobales = [];
let usuarioActual = null;
let cursoFiltroActual = "TODOS";

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
    } else { alert(icono + " " + mensaje); }
}

async function cargarDatosDesdeServidor() {
    try {
        const urlSinCache = `${API_URL}/datos?t=${new Date().getTime()}`;
        const resp = await fetch(urlSinCache);
        if (!resp.ok) throw new Error("Error en el servidor al traer los datos.");
        const data = await resp.json();
        usuariosBD = data.usuarios || []; 
        pagosGlobales = data.pagos || [];
        ingresosGlobales = data.ingresos || []; 
        egresosGlobales = data.egresos || [];
        contratosGlobales = data.contratos || [];
        actasGlobales = data.actas || [];
        actividadesGlobales = data.actividades || [];
    } catch (e) {
        console.error(e);
        mostrarAlerta("Error al descargar la información de la base de datos.", "❌");
    }
}

// ================= INYECTOR AUTOMÁTICO DE INTERFAZ (UI) =================
function inyectarNuevasFunciones() {
    // 5. CAMBIO ESTRICTO DE NOMBRE (SOLO SIGECO 28)
    document.title = "SIGECO 28";
    const brand = document.querySelector('.navbar-brand');
    if (brand) brand.innerHTML = '<i class="bi bi-shield-check me-2"></i>SIGECO 28';

    // Restringir Pagos a solo Imágenes JPG
    const filePago = document.getElementById('pago-voucher-file');
    if(filePago) {
        filePago.setAttribute('accept', '.jpg, .jpeg');
        filePago.setAttribute('title', 'Solo se permiten imágenes JPG');
    }

    // 1. FILTRO DE CURSO AISLADO (SOLO EN RESUMEN DE CURSO)
    const adminModuloCurso = document.getElementById('admin-modulo-curso');
    if (adminModuloCurso && !document.getElementById('filtro-curso-global')) {
        const filtroHTML = `
        <div class="card shadow-sm mb-4 border-primary" id="filtro-curso-global">
            <div class="card-body d-flex align-items-center bg-light rounded">
                <label class="fw-bold me-3 mb-0 text-primary"><i class="bi bi-funnel-fill me-2"></i>Filtrar vistas por Curso:</label>
                <select class="form-select w-auto border-primary shadow-sm" id="select-filtro-curso" onchange="aplicarFiltroCurso(this.value)">
                    <option value="TODOS">Todos los Cursos (General)</option>
                </select>
            </div>
        </div>`;
        adminModuloCurso.insertAdjacentHTML('afterbegin', filtroHTML);
    }

    // Crear Modal de Actividades si no existe
    if (!document.getElementById('modalActividad')) {
        const modalHTML = `
        <div class="modal fade" id="modalActividad" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title"><i class="bi bi-cash-coin me-2"></i>Registrar Ingreso por Actividad</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-actividad">
                            <div class="mb-3"><label class="fw-bold">Curso / Paralelo</label><input type="text" class="form-control" id="act-curso" required placeholder="Ej: 8vo B"></div>
                            <div class="mb-3"><label class="fw-bold">Descripción (Ej. Rifa, Bingo)</label><input type="text" class="form-control" id="act-desc" required></div>
                            <div class="mb-3"><label class="fw-bold">Fecha</label><input type="date" class="form-control" id="act-fecha" required></div>
                            <div class="mb-3"><label class="fw-bold">Valor Recaudado ($)</label><input type="number" step="0.01" class="form-control" id="act-valor" required></div>
                            <div class="mb-3">
                                <label class="fw-bold">Documento de Respaldo (PDF - Máx 3MB)</label>
                                <input type="file" class="form-control" id="act-file" accept=".pdf" required>
                                <div id="feedback-act-file" class="text-success small mt-1 oculto"></div>
                            </div>
                            <button type="submit" class="btn btn-success w-100 fw-bold">Guardar Actividad</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('form-actividad').addEventListener('submit', registrarActividad);
        
        document.getElementById('act-file').addEventListener('change', function(e) {
            const fb = document.getElementById('feedback-act-file');
            if (this.files.length > 0) {
                fb.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${this.files[0].name}`;
                fb.classList.remove('oculto');
                this.classList.add('is-valid');
            } else { fb.classList.add('oculto'); this.classList.remove('is-valid'); }
        });
    }

    const adminPortal = document.getElementById('portal-admin');
    if (adminPortal && !document.getElementById('admin-modulo-actividades')) {
        const moduloHTML = `
        <div id="admin-modulo-actividades" class="oculto mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="text-success fw-bold"><i class="bi bi-cash-coin me-2"></i>Ingresos por Actividades Extras</h4>
                <button class="btn btn-success shadow-sm fw-bold" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('modalActividad')).show()">
                    <i class="bi bi-plus-circle me-1"></i> Nueva Actividad
                </button>
            </div>
            <div class="table-responsive bg-white rounded shadow border p-3">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-success"><tr><th>Fecha</th><th>Curso</th><th>Descripción</th><th>Valor Recaudado</th><th>Respaldo</th></tr></thead>
                    <tbody id="tabla-actividades"></tbody>
                </table>
            </div>
        </div>`;
        adminPortal.insertAdjacentHTML('beforeend', moduloHTML);
    }
}

async function iniciarSesion(e) {
    e.preventDefault();
    try {
        const resp = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: document.getElementById('username').value.trim(), password: document.getElementById('password').value })
        });
        const data = await resp.json();
        if (data.exito) {
            await cargarDatosDesdeServidor();
            inyectarNuevasFunciones(); 
            
            if(data.usuario.debe_cambiar_clave === 1) {
                usuarioActual = data.usuario;
                document.getElementById('vista-login').classList.add('oculto');
                bootstrap.Modal.getOrCreateInstance(document.getElementById('modalForzarClave')).show();
            } else { cargarPortalSegunRol(data.usuario); }
        } else {
            const errDiv = document.getElementById('mensaje-error');
            if(errDiv) { errDiv.classList.remove('oculto'); errDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${data.mensaje}`; }
        }
    } catch (error) { mostrarAlerta("Error de conexión con el servidor en la nube.", "❌"); }
}

async function guardarClaveForzada(e) {
    e.preventDefault();
    const nuevaClave = document.getElementById('nueva-clave-forzada').value;
    const resp = await fetch(`${API_URL}/usuarios/clave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usuarioActual.username, password: nuevaClave, forzar: 0 }) });
    const data = await resp.json();
    if(resp.ok && data.exito){
        usuarioActual.debe_cambiar_clave = 0;
        bootstrap.Modal.getInstance(document.getElementById('modalForzarClave')).hide();
        document.getElementById('form-forzar-clave').reset();
        mostrarAlerta('Contraseña actualizada con éxito.', '🔐');
        cargarPortalSegunRol(usuarioActual);
    } else { mostrarAlerta("Error al cambiar contraseña.", "❌"); }
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
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('actividades', this)"><i class="bi bi-cash-coin me-2"></i> Actividades Extra</a></li>
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
        
        actualizarSelectCursos();
        renderizarTodasLasTablasAdmin();
        renderizarDashboardCurso();
    } else {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-2"></i> Estado de Cuenta</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open-fill me-2"></i> Documentos y Actas</a></li>
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
    document.querySelectorAll('#portal-admin > div').forEach(d => { 
        if(d.id && d.id.startsWith('admin-modulo-')) d.classList.add('oculto'); 
    });
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

function aplicarFiltroCurso(curso) {
    cursoFiltroActual = curso;
    renderizarTodasLasTablasAdmin();
}

function actualizarSelectCursos() {
    const select = document.getElementById('select-filtro-curso');
    if(!select) return;
    const cursos = [...new Set(usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== ''))].sort();
    const valorActual = select.value;
    select.innerHTML = '<option value="TODOS">Todos los Cursos (General)</option>';
    cursos.forEach(c => { select.innerHTML += `<option value="${c}">Solo mostrar ${c}</option>`; });
    if(cursos.includes(valorActual)) select.value = valorActual;
}

async function renderizarTodasLasTablasAdmin() {
    await cargarDatosDesdeServidor();
    actualizarSelectCursos();

    let usuariosParaRender = usuariosBD;
    let pagosParaRender = pagosGlobales;
    let actividadesParaRender = actividadesGlobales;

    if (cursoFiltroActual !== "TODOS") {
        usuariosParaRender = usuariosBD.filter(u => u.curso === cursoFiltroActual);
        pagosParaRender = pagosGlobales.filter(p => {
            let u = usuariosBD.find(x => x.username === p.usuario);
            return u && u.curso === cursoFiltroActual;
        });
        actividadesParaRender = actividadesGlobales.filter(a => a.curso === cursoFiltroActual);
    }

    renderizarDashboardAdmin(pagosParaRender, actividadesParaRender);
    
    const tbU = document.getElementById('tabla-usuarios-admin'); 
    if(tbU) {
        tbU.innerHTML = '';
        usuariosParaRender.forEach(u => {
            let btnSt = u.estado === "ACTIVO" 
                ? `<button class="btn btn-sm btn-outline-danger fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-x-circle-fill me-1"></i>Desactivar</button>` 
                : `<button class="btn btn-sm btn-success fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-check-circle-fill me-1"></i>Activar</button>`;
            tbU.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td><span class="badge bg-primary px-2">${u.rol}</span></td><td><span class="badge bg-dark">${u.curso||'-'}</span></td><td><span class="badge ${u.estado==='ACTIVO'?'bg-success':'bg-secondary'} px-2 py-1">${u.estado}</span></td><td><div class="d-flex flex-column flex-md-row justify-content-center align-items-center"><button class="btn btn-sm btn-primary fw-bold me-md-1 shadow-sm" onclick="abrirModalUsuario('${u.username}')"><i class="bi bi-pencil-fill me-1"></i>Editar</button>${btnSt}</div></td></tr>`;
        });
    }
    
    const selectPadres = document.getElementById('pago-usuario');
    if(selectPadres) {
        selectPadres.innerHTML = '<option value="">-- Seleccione un padre --</option>';
        usuariosParaRender.filter(u => u.rol === 'PADRE').forEach(u => {
            selectPadres.innerHTML += `<option value="${u.username}">${u.nombre} (${u.username} - ${u.curso||'Sin curso'})</option>`;
        });
    }

    const tp = document.getElementById('tabla-pagos'); 
    if(tp) {
        tp.innerHTML = '';
        if(pagosParaRender.length === 0) tp.innerHTML = `<tr><td colspan="7" class="text-muted py-4">No hay pagos para mostrar.</td></tr>`;
        pagosParaRender.forEach(p => {
            const datosUsuario = usuariosBD.find(u => u.username === p.usuario);
            const nombreCompleto = datosUsuario ? datosUsuario.nombre : 'Usuario Desconocido';
            const btnVoucher = p.tiene_voucher ? `<button class="btn btn-sm btn-info text-white fw-bold ms-2 shadow-sm" onclick="abrirVoucher(${p.id})"><i class="bi bi-image me-1"></i>Voucher</button>` : '';
            tp.innerHTML += `<tr><td class="fw-bold text-dark text-start">${nombreCompleto} <br><small class="text-muted">${datosUsuario?datosUsuario.curso:''}</small></td><td class="text-primary fw-bold">${p.usuario}</td><td>${p.fecha}</td><td>${p.voucher} ${btnVoucher}</td><td class="fw-bold text-success">$${parseFloat(p.valor || 0).toFixed(2)}</td><td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'} px-2 py-1">${p.estado}</span></td><td>${p.estado==='PENDIENTE'?`<button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="validarPago(${p.id})"><i class="bi bi-check2 me-1"></i>Aprobar</button>`:'<i class="bi bi-check-circle-fill text-success fs-5"></i>'}</td></tr>`;
        });
    }
    
    const tact = document.getElementById('tabla-actividades');
    if(tact) {
        tact.innerHTML = '';
        if(actividadesParaRender.length === 0) tact.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay actividades registradas en este curso.</td></tr>`;
        actividadesParaRender.forEach(a => {
            const btnDoc = a.tiene_doc ? `<button class="btn btn-sm btn-outline-success fw-bold shadow-sm" onclick="verActividadPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Respaldo</button>` : '-';
            tact.innerHTML += `<tr><td>${a.fecha}</td><td class="fw-bold"><span class="badge bg-dark">${a.curso}</span></td><td class="fw-bold text-dark">${a.descripcion}</td><td class="fw-bold text-success">+$${parseFloat(a.valor || 0).toFixed(2)}</td><td>${btnDoc}</td></tr>`;
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
        usuariosParaRender.filter(u => u.rol === 'PADRE').forEach(u => {
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

function renderizarDashboardAdmin(pagosRender, actiRender) {
    let pagosValidados = pagosRender.filter(p => p.estado === 'VALIDADO').reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    let totalIngresosAct = actiRender.reduce((s, a) => s + parseFloat(a.valor || 0), 0);
    let totalIngresosBase = (cursoFiltroActual === "TODOS") ? ingresosGlobales.reduce((s, i) => s + parseFloat(i.valor || 0), 0) : 0;
    
    let totalIngresos = totalIngresosBase + pagosValidados + totalIngresosAct;
    let totalEgresos = (cursoFiltroActual === "TODOS") ? egresosGlobales.reduce((s, e) => s + parseFloat(e.valor || 0), 0) : 0;
    
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
    } catch (e) { console.error("Error cargando dashboard", e); }
}

// ================= 4. TABLERO DE LOS PADRES SEPARADO EN SECCIONES =================
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

        const vistaDocs = document.getElementById('padre-vista-documentos'); 
        if(vistaDocs) {
            const docsVisibles = contratosGlobales.filter(c => c.visible);
            const misActividades = actividadesGlobales.filter(a => a.curso === userDatos.curso);
            
            let htmlContratos = docsVisibles.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay contratos públicos habilitados.</td></tr>` : '';
            docsVisibles.forEach(c => {
                const descripcionC = c.desc || c.descripcion || '';
                htmlContratos += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${descripcionC}</td><td><button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="verDocumentoPDF(${c.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Documento</button></td></tr>`;
            });

            let htmlActividades = misActividades.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay actividades extra registradas en tu curso.</td></tr>` : '';
            misActividades.forEach(a => {
                const btnDoc = a.tiene_doc ? `<button class="btn btn-sm btn-outline-success fw-bold shadow-sm" onclick="verActividadPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Respaldo</button>` : '-';
                htmlActividades += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion} <br><small class="text-success">+$${parseFloat(a.valor||0).toFixed(2)}</small></td><td>${btnDoc}</td></tr>`;
            });

            let htmlActas = actasGlobales.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay actas de reuniones disponibles.</td></tr>` : '';
            actasGlobales.forEach(a => {
                htmlActas += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion}</td><td><button class="btn btn-sm btn-dark fw-bold shadow-sm" onclick="verActaPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Abrir Acta</button></td></tr>`;
            });

            // Reconstrucción del HTML dividiendo las vistas
            vistaDocs.innerHTML = `
                <h4 class="fw-bold text-dark mb-4 border-bottom pb-2"><i class="bi bi-folder2-open-fill me-2"></i>Documentos y Registros</h4>
                
                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-primary text-white fw-bold"><i class="bi bi-file-earmark-text-fill me-2"></i>1. Contratos Vigentes</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlContratos}</tbody></table></div>
                </div>

                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-success text-white fw-bold"><i class="bi bi-cash-coin me-2"></i>2. Ingresos por Actividades (Tu Curso: ${userDatos.curso})</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlActividades}</tbody></table></div>
                </div>

                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-secondary text-white fw-bold"><i class="bi bi-briefcase-fill me-2"></i>3. Actas de Reuniones del Comité</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlActas}</tbody></table></div>
                </div>
            `;
        }
    });
}

// ================= 3. DESCARGA INFALIBLE CON TECNOLOGÍA BLOB =================
async function descargarArchivoInmune(url, nombreDefault) {
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.exito && data.base64) {
            let b64 = data.base64;
            if (!b64.includes('base64,')) {
                if (b64.startsWith('JVBER')) b64 = 'data:application/pdf;base64,' + b64;
                else if (b64.startsWith('iVBOR')) b64 = 'data:image/png;base64,' + b64;
                else if (b64.startsWith('/9j/')) b64 = 'data:image/jpeg;base64,' + b64;
                else b64 = 'data:application/pdf;base64,' + b64; 
            }
            
            // Convertir de Base64 a archivo físico Blob (Soporta PDFs pesados)
            const arr = b64.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            const blob = new Blob([u8arr], {type: mime});
            
            // Generar descarga
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = blobUrl;
            a.download = nombreDefault; 
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } else { mostrarAlerta("Documento no encontrado o corrupto.", "❌"); }
    } catch (e) { mostrarAlerta("Error al descargar el archivo de la base de datos.", "❌"); }
}

function abrirVoucher(id) { descargarArchivoInmune(`${API_URL}/pagos/ver/${id}?t=${new Date().getTime()}`, `voucher_pago_${id}.jpg`); }
function verDocumentoPDF(id) { descargarArchivoInmune(`${API_URL}/documentos/ver/${id}?t=${new Date().getTime()}`, `documento_contrato_${id}.pdf`); }
function verActaPDF(id) { descargarArchivoInmune(`${API_URL}/actas/ver/${id}?t=${new Date().getTime()}`, `acta_reunion_${id}.pdf`); }
function verEgresoPDF(id) { descargarArchivoInmune(`${API_URL}/egresos/ver/${id}?t=${new Date().getTime()}`, `factura_egreso_${id}.pdf`); }
function verActividadPDF(id) { descargarArchivoInmune(`${API_URL}/actividades/ver/${id}?t=${new Date().getTime()}`, `respaldo_actividad_${id}.pdf`); }

// ================= 2. PROTECCIÓN CONTRA ARCHIVOS MUY PESADOS =================
function leerArchivoComoBase64(file) { 
    return new Promise((res, rej) => { 
        if(file.size > 3500000) { 
            mostrarAlerta("El archivo es demasiado pesado (Máximo 3.5MB). Vercel bloqueará la subida.", "⚠️");
            rej("Archivo muy pesado");
            return;
        }
        const reader = new FileReader(); 
        reader.onload = () => res(reader.result); 
        reader.onerror = rej; 
        reader.readAsDataURL(file); 
    }); 
}

async function registrarPago(e) { 
    e.preventDefault(); 
    const fileInput = document.getElementById('pago-voucher-file');
    let voucherB64 = "";
    
    if(fileInput && fileInput.files.length > 0) {
        const f = fileInput.files[0];
        if(!f.type.match('image/jpeg')) {
            mostrarAlerta("Solo se permiten archivos en formato de imagen JPG / JPEG. El sistema no permite PDFs ni PNGs aquí.", "⚠️");
            limpiarFeedbackArchivos();
            return; 
        }
        try { voucherB64 = await leerArchivoComoBase64(f); } catch(err) { return; }
    }

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
        } else { mostrarAlerta("Error al guardar: " + data.mensaje, "❌"); }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function registrarActividad(e) {
    e.preventDefault();
    const file = document.getElementById('act-file').files[0];
    if(!file) { mostrarAlerta("Debes adjuntar el PDF de respaldo.", "⚠️"); return; }
    
    let b64 = "";
    try { b64 = await leerArchivoComoBase64(file); } catch(err) { return; }

    const p = {
        curso: document.getElementById('act-curso').value.trim(),
        descripcion: document.getElementById('act-desc').value.trim(),
        fecha: document.getElementById('act-fecha').value,
        valor: parseFloat(document.getElementById('act-valor').value),
        archivoNombre: file.name,
        archivoData: b64
    };
    
    try {
        const resp = await fetch(`${API_URL}/actividades`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalActividad')).hide();
            document.getElementById('form-actividad').reset();
            limpiarFeedbackArchivos();
            mostrarAlerta("Ingreso por Actividad guardado correctamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { mostrarAlerta("Error al subir actividad: " + data.mensaje, "❌"); }
    } catch(error) { mostrarAlerta("Error de conexión al servidor.", "❌"); }
}

async function registrarEgreso(e) {
    e.preventDefault();
    const file = document.getElementById('egreso-file').files[0];
    let b64 = "", fileName = "";
    if(file) { 
        try { b64 = await leerArchivoComoBase64(file); fileName = file.name; } 
        catch(err) { return; } 
    }

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
        } else { mostrarAlerta("Error al registrar egreso: " + data.mensaje, "❌"); }
    } catch(error) { mostrarAlerta("Error de conexión.", "❌"); }
}

async function subirActa(e) {
    e.preventDefault();
    const file = document.getElementById('acta-file').files[0];
    if(!file) { mostrarAlerta("Por favor, selecciona un documento PDF.", "⚠️"); return; }
    
    let b64 = "";
    try { b64 = await leerArchivoComoBase64(file); } catch(err) { return; }
    
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
            mostrarAlerta("Acta subida correctamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { mostrarAlerta("Error al subir acta: " + data.mensaje, "❌"); }
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
        } else { mostrarAlerta("Error al guardar usuario: " + data.mensaje, "❌"); }
    } catch(error) { mostrarAlerta("Error de conexión.", "❌"); }
}

async function toggleEstadoUsuario(username) {
    const u = usuariosBD.find(x => x.username === username);
    const nuevoEstado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await fetch(`${API_URL}/usuarios/estado`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, estado: nuevoEstado }) });
    renderizarTodasLasTablasAdmin();
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
    
    let b64 = "";
    try { b64 = await leerArchivoComoBase64(file); } catch(err) { return; }
    
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
        } else { mostrarAlerta("Error al guardar: " + data.mensaje, "❌"); }
    } catch(error) { mostrarAlerta("Error de conexión.", "❌"); }
}

async function toggleVisibleDoc(id, val) { 
    await fetch(`${API_URL}/documentos/visible`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, visible: val ? 1 : 0 }) }); 
    renderizarTodasLasTablasAdmin(); 
}