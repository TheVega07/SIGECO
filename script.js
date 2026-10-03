let usuariosBD = [], pagosGlobales = [], ingresosGlobales = [], egresosGlobales = [];
let contratosGlobales = [], actasGlobales = [], actividadesGlobales = [];
let usuarioActual = null;
let cursoFiltroActual = "TODOS";

const API_URL = "/api"; 
const PRECIO_ADULTO = 101.00;
const PRECIO_NINO = 81.00;

function forzarNombreSIGECO28() {
    document.title = "SIGECO 28";
    const brand = document.querySelector('.navbar-brand');
    if (brand) {
        brand.innerHTML = `
            <div class="d-flex flex-column">
                <span class="fw-bold"><i class="bi bi-shield-check me-2"></i>SIGECO 28</span>
                <span style="font-size: 0.85rem; font-weight: normal; opacity: 0.9; line-height: 1.2; margin-top: 2px; text-transform: none;">
                    Desarrollado por SmartFastSolution LATAM<br>infosfs@sfslatams.com
                </span>
            </div>
        `;
    }

    const titulosLogin = document.querySelectorAll('#vista-login h1, #vista-login h2, #vista-login h3, #vista-login h4, #vista-login .card-title, #vista-login .card-header');
    titulosLogin.forEach(el => {
        if(el.innerHTML.includes('SIGECO') && !el.innerHTML.includes('28')) {
            el.innerHTML = el.innerHTML.replace(/SIGECO(\sPortal)?/gi, 'SIGECO 28');
        } else if (!el.innerHTML.includes('SIGECO')) {
            el.innerHTML = 'SIGECO 28 - ' + el.innerHTML;
        }
    });

    const formLogin = document.getElementById('form-login');
    if (formLogin && !document.getElementById('marca-login-sfs')) {
        const marcaHTML = `
            <div id="marca-login-sfs" class="text-center mt-4 pt-3 border-top">
                <p class="mb-0 fw-bold text-dark">SIGECO 28</p>
                <p class="mb-0 text-muted small">Desarrollado por SmartFastSolution LATAM</p>
                <a href="mailto:infosfs@sfslatams.com" class="text-success small text-decoration-none">infosfs@sfslatams.com</a>
            </div>
        `;
        formLogin.insertAdjacentHTML('beforeend', marcaHTML);
    }
}

function hacerTablasResponsivas() {
    const tablas = document.querySelectorAll('table');
    tablas.forEach(tabla => {
        if (!tabla.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.classList.add('table-responsive', 'mb-3');
            tabla.parentNode.insertBefore(wrapper, tabla);
            wrapper.appendChild(tabla);
        }
        tabla.classList.add('text-nowrap');
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    forzarNombreSIGECO28();

    const sesionGuardada = sessionStorage.getItem('sesionSIGECO');
    if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        document.getElementById('vista-login').classList.add('oculto');
        document.getElementById('vista-app').style.display = '';
        document.getElementById('vista-app').classList.remove('oculto');
        
        await cargarDatosDesdeServidor();
        inyectarNuevasFunciones();
        hacerTablasResponsivas();
        cargarPortalSegunRol(usuarioActual);
    } else {
        document.getElementById('vista-app').classList.add('oculto');
        document.getElementById('vista-login').classList.remove('oculto');
    }

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

function compararCursos(c1, c2) {
    if(!c1 || !c2) return false;
    return c1.toUpperCase().replace(/\s+/g, '') === c2.toUpperCase().replace(/\s+/g, '');
}

function inyectarNuevasFunciones() {
    forzarNombreSIGECO28();

    const filePago = document.getElementById('pago-voucher-file');
    if(filePago) {
        filePago.setAttribute('accept', '.jpg, .jpeg');
        filePago.setAttribute('title', 'Solo se permiten imágenes JPG');
    }

    const adminModuloCurso = document.getElementById('admin-modulo-curso');
    if (adminModuloCurso && !document.getElementById('filtro-curso-global')) {
        const filtroHTML = `
        <div class="card shadow-sm mb-4 border-primary" id="filtro-curso-global">
            <div class="card-body p-3 bg-light rounded">
                <div class="d-flex flex-column flex-md-row align-items-md-center">
                    <label class="fw-bold text-primary mb-2 mb-md-0 me-md-3 text-nowrap">
                        <i class="bi bi-funnel-fill me-2"></i>Filtrar vistas por Curso:
                    </label>
                    <select class="form-select border-primary shadow-sm w-100" id="select-filtro-curso" onchange="aplicarFiltroCurso(this.value)">
                        <option value="TODOS">Todos los Cursos (General)</option>
                    </select>
                </div>
            </div>
        </div>`;
        adminModuloCurso.insertAdjacentHTML('afterbegin', filtroHTML);
    }

    if (adminModuloCurso && !document.getElementById('contenedor-graficos-progreso')) {
        const graficosHTML = `
        <div class="card shadow-sm mt-4" id="contenedor-graficos-progreso">
            <div class="card-header bg-white border-bottom">
                <h5 class="card-title fw-bold text-dark mb-0"><i class="bi bi-bar-chart-steps me-2 text-primary"></i>Avance por Paralelo</h5>
            </div>
            <div class="card-body p-3" id="lista-barras-progreso">
            </div>
        </div>`;
        adminModuloCurso.insertAdjacentHTML('beforeend', graficosHTML);
    }

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
                            <div class="mb-3">
                                <label class="fw-bold">Curso / Paralelo</label>
                                <select class="form-select" id="act-curso" required>
                                    <option value="">-- Seleccione un Curso --</option>
                                    <option value="TODOS">🌐 Todos los Cursos (General)</option>
                                </select>
                            </div>
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

    // INYECTAR MODAL DE FIESTA PARA EL PADRE
    if (!document.getElementById('modalFiestaPadre')) {
        const modalFiestaHTML = `
        <div class="modal fade" id="modalFiestaPadre" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="bi bi-balloon-fill me-2"></i>Invitados a la Fiesta Familiar</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-fiesta-padre">
                            <div class="alert alert-info small">
                                <strong>Valores Oficiales del Comité:</strong><br>
                                - Adultos: $${PRECIO_ADULTO.toFixed(2)} c/u<br>
                                - Niños: $${PRECIO_NINO.toFixed(2)} c/u<br>
                                <br>
                                <em>Nota: Estos valores se agregarán automáticamente como un nuevo gasto (deuda) en su Estado de Cuenta.</em>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="fw-bold">Cantidad de Adultos</label>
                                    <input type="number" class="form-control" id="padre-adultos" min="0" value="0" required>
                                </div>
                                <div class="col-6">
                                    <label class="fw-bold">Cantidad de Niños</label>
                                    <input type="number" class="form-control" id="padre-ninos" min="0" value="0" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold">Confirmar Asistencia y Actualizar Mis Gastos</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalFiestaHTML);
        document.getElementById('form-fiesta-padre').addEventListener('submit', guardarFiestaPadre);
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
            sessionStorage.setItem('sesionSIGECO', JSON.stringify(data.usuario));
            
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
        sessionStorage.setItem('sesionSIGECO', JSON.stringify(usuarioActual));
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
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('egresos', this)"><i class="bi bi-cart-fill me-2"></i> Egresos Comité</a></li>
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
        cambiarModuloAdmin('resumen', document.querySelector('#menu-navegacion .nav-link')); 
    } else {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-2"></i> Mi Estado de Cuenta</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('gastos', this)"><i class="bi bi-cart-x-fill me-2"></i> Transparencia del Comité</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open-fill me-2"></i> Documentos y Actas</a></li>
        `;
        
        const portalPadre = document.getElementById('portal-padre');
        if (portalPadre && !document.getElementById('padre-vista-gastos')) {
            const gastosHTML = `
            <div id="padre-vista-gastos" class="oculto">
                <h4 class="fw-bold text-danger mb-4 border-bottom pb-2"><i class="bi bi-cart-x-fill me-2"></i>Transparencia: Gastos de la Directiva</h4>
                <div class="alert alert-warning small">
                    <strong>Nota Importante:</strong> Estos son los gastos generales realizados por la directiva del comité con el dinero recaudado. <strong>Estos valores no representan deudas suyas.</strong>
                </div>
                <div class="card shadow-sm mb-4">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle text-center mb-0">
                                <thead class="table-danger">
                                    <tr><th>Fecha</th><th>Concepto de Gasto (Comité)</th><th>Valor Pagado</th><th>Estado</th><th>Comprobante / Factura</th></tr>
                                </thead>
                                <tbody id="tabla-egresos-padre"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;
            portalPadre.insertAdjacentHTML('beforeend', gastosHTML);
        }

        document.getElementById('portal-padre').classList.remove('oculto');
        document.getElementById('portal-admin').classList.add('oculto');
        actualizarDashboardPadre();
    }
    
    setTimeout(hacerTablasResponsivas, 500); 
}

function cerrarSesion() {
    usuarioActual = null;
    sessionStorage.removeItem('sesionSIGECO');
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('vista-login').classList.remove('oculto');
    document.getElementById('form-login').reset();
    forzarNombreSIGECO28();
}

function cerrarMenuMobile() {
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('.navbar-collapse');
    if (collapse && collapse.classList.contains('show')) toggler.click();
}

async function cambiarModuloAdmin(modulo, el) {
    document.querySelectorAll('#portal-admin > div').forEach(d => { 
        if(d.id && d.id.startsWith('admin-modulo-')) d.classList.add('oculto'); 
    });
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    const div = document.getElementById(`admin-modulo-${modulo}`);
    if (div) div.classList.remove('oculto');
    if (el) el.classList.add('active');
    cerrarMenuMobile();
    await renderizarTodasLasTablasAdmin();
}

async function cambiarVistaPadre(vista, el) {
    document.querySelectorAll('#portal-padre > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    const div = document.getElementById(`padre-vista-${vista}`);
    if (div) div.classList.remove('oculto');
    if(el) el.classList.add('active');
    cerrarMenuMobile();
    await actualizarDashboardPadre();
}

function aplicarFiltroCurso(curso) {
    cursoFiltroActual = curso;
    renderizarTodasLasTablasAdmin();
}

function actualizarSelectCursos() {
    const selectFiltro = document.getElementById('select-filtro-curso');
    const selectModal = document.getElementById('act-curso'); 
    
    const cursos = [...new Set(usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== ''))].sort();
    
    if(selectFiltro) {
        const valorActual = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="TODOS">Todos los Cursos (General)</option>';
        cursos.forEach(c => { selectFiltro.innerHTML += `<option value="${c}">Solo mostrar ${c}</option>`; });
        if(cursos.includes(valorActual)) selectFiltro.value = valorActual;
    }

    if(selectModal) {
        const valModal = selectModal.value;
        selectModal.innerHTML = `
            <option value="">-- Seleccione un Curso --</option>
            <option value="TODOS">🌐 Todos los Cursos (General)</option>
        `;
        cursos.forEach(c => { selectModal.innerHTML += `<option value="${c}">${c}</option>`; });
        if(cursos.includes(valModal) || valModal === "TODOS") selectModal.value = valModal;
    }
}

async function renderizarTodasLasTablasAdmin() {
    await cargarDatosDesdeServidor();
    actualizarSelectCursos();

    let usuariosParaRender = usuariosBD;
    let pagosParaRender = pagosGlobales;
    let actividadesParaRender = actividadesGlobales;

    if (cursoFiltroActual !== "TODOS") {
        usuariosParaRender = usuariosBD.filter(u => compararCursos(u.curso, cursoFiltroActual));
        pagosParaRender = pagosGlobales.filter(p => {
            let u = usuariosBD.find(x => x.username === p.usuario);
            return u && compararCursos(u.curso, cursoFiltroActual);
        });
        actividadesParaRender = actividadesGlobales.filter(a => compararCursos(a.curso, cursoFiltroActual) || a.curso.toUpperCase() === 'TODOS');
    }

    renderizarDashboardAdmin(pagosParaRender, actividadesParaRender);
    renderizarDashboardCurso(); 
    
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
        const theadE = te.closest('table').querySelector('thead tr');
        if (theadE && !theadE.innerHTML.includes('Estado')) {
            theadE.innerHTML = `<th>Fecha</th><th>Descripción</th><th>Proveedor</th><th>Valor</th><th>Estado</th><th>Acciones</th>`;
        }
        te.innerHTML = '';
        if(egresosGlobales.length === 0) te.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No hay egresos registrados.</td></tr>`;
        
        egresosGlobales.forEach(e => {
            const btnDoc = e.tiene_doc ? `<button class="btn btn-sm btn-outline-danger fw-bold shadow-sm" onclick="verEgresoPDF(${e.id})"><i class="bi bi-file-pdf-fill me-1"></i>Factura</button>` : '-';
            const estadoActual = e.estado_pago || 'PENDIENTE';
            const nuevoEstado = estadoActual === 'PAGADO' ? 'PENDIENTE' : 'PAGADO';
            
            const btnEstado = estadoActual === 'PENDIENTE' 
                ? `<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="marcarEgresoEstado(${e.id}, '${nuevoEstado}')"><i class="bi bi-check2"></i> Pagar</button>`
                : `<button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="marcarEgresoEstado(${e.id}, '${nuevoEstado}')"><i class="bi bi-arrow-counterclockwise"></i> Revertir</button>`;
            
            const btnEliminar = `<button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="eliminarEgreso(${e.id})" title="Eliminar Egreso de la Base de Datos"><i class="bi bi-trash-fill"></i></button>`;

            te.innerHTML += `<tr>
                <td>${e.fecha}</td>
                <td class="fw-bold text-dark">${e.descripcion}</td>
                <td>${e.proveedor}</td>
                <td class="fw-bold text-danger">-$${parseFloat(e.valor || 0).toFixed(2)}</td>
                <td><span class="badge ${estadoActual === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1">${estadoActual}</span></td>
                <td><div class="d-flex gap-1 justify-content-center">${btnDoc} ${btnEstado} ${btnEliminar}</div></td>
            </tr>`;
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
            const cuotaBase = parseFloat(u.valor_total_pagar || 0);
            const cantAdultos = parseInt(u.adultos_fiesta || 0);
            const cantNinos = parseInt(u.ninos_fiesta || 0);
            const totalDeuda = cuotaBase + (cantAdultos * PRECIO_ADULTO) + (cantNinos * PRECIO_NINO); 
            
            const pagosPadre = pagosGlobales.filter(p => p.usuario === u.username && p.estado === 'VALIDADO');
            const totalPagadoPadre = pagosPadre.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
            const saldoPadre = totalDeuda - totalPagadoPadre;

            tc.innerHTML += `
            <tr>
                <td class="text-primary fw-bold">${u.username}</td>
                <td>${u.nombre} <br><span class="badge bg-dark">${u.curso||'Sin curso'}</span></td>
                <td>
                    <div class="small">Cuota Base: <span class="fw-bold">$${cuotaBase.toFixed(2)}</span></div>
                    <div class="small text-muted">Fiesta: <span class="fw-bold">$${((cantAdultos * PRECIO_ADULTO) + (cantNinos * PRECIO_NINO)).toFixed(2)}</span></div>
                    <div class="fw-bold text-dark border-top pt-1 mt-1">Total a Pagar: $${totalDeuda.toFixed(2)}</div>
                </td>
                <td>
                    <div class="small text-success mb-1">Total Abonado: <span class="fw-bold">$${totalPagadoPadre.toFixed(2)}</span></div>
                    <div class="fw-bold text-danger border-top pt-1">Saldo Pendiente: $${saldoPadre.toFixed(2)}</div>
                </td>
                <td><button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="abrirModalCuota('${u.username}', ${cuotaBase})"><i class="bi bi-pencil-fill me-1"></i>Modificar Base</button></td>
            </tr>`;
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
    
    setTimeout(hacerTablasResponsivas, 200);
}

function renderizarDashboardAdmin(pagosRender, actiRender) {
    let pagosValidados = pagosRender.filter(p => p.estado === 'VALIDADO').reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    let totalIngresosAct = actiRender.reduce((s, a) => s + parseFloat(a.valor || 0), 0);
    let totalIngresosBase = (cursoFiltroActual === "TODOS") ? ingresosGlobales.reduce((s, i) => s + parseFloat(i.valor || 0), 0) : 0;
    
    let totalIngresos = totalIngresosBase + pagosValidados + totalIngresosAct;
    let totalEgresos = (cursoFiltroActual === "TODOS") ? egresosGlobales.reduce((s, e) => s + parseFloat(e.valor || 0), 0) : 0;
    
    let metaTotal = 0;
    let usuariosParaMeta = (cursoFiltroActual === "TODOS") ? usuariosBD.filter(u => u.rol === 'PADRE') : usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, cursoFiltroActual));
    
    usuariosParaMeta.forEach(u => {
        let cuota = parseFloat(u.valor_total_pagar || 0);
        let fiesta = (parseInt(u.adultos_fiesta || 0) * PRECIO_ADULTO) + (parseInt(u.ninos_fiesta || 0) * PRECIO_NINO);
        metaTotal += (cuota + fiesta);
    });
    
    if(document.getElementById('dash-ingresos')) document.getElementById('dash-ingresos').innerText = `$${totalIngresos.toFixed(2)}`;
    if(document.getElementById('dash-egresos')) document.getElementById('dash-egresos').innerText = `$${totalEgresos.toFixed(2)}`;
    if(document.getElementById('dash-saldo')) document.getElementById('dash-saldo').innerText = `$${(totalIngresos - totalEgresos).toFixed(2)}`;
    if(document.getElementById('dash-meta')) document.getElementById('dash-meta').innerText = `$${metaTotal.toFixed(2)}`;
}

function renderizarDashboardCurso() {
    const tc = document.getElementById('tabla-dashboard-curso');
    const contenedorBarras = document.getElementById('lista-barras-progreso');
    if(!tc) return;

    let cursosUnicos = [...new Set(usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== ''))].sort();
    if(cursoFiltroActual !== "TODOS") { cursosUnicos = cursosUnicos.filter(c => compararCursos(c, cursoFiltroActual)); }

    tc.innerHTML = '';
    if (contenedorBarras) contenedorBarras.innerHTML = '';

    if(cursosUnicos.length === 0) {
        tc.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay datos para mostrar.</td></tr>`;
        if (contenedorBarras) contenedorBarras.innerHTML = `<p class="text-muted mb-0">No hay datos de avance para mostrar.</p>`;
        return;
    }

    cursosUnicos.forEach(curso => {
        const alumnos = usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, curso));
        const totalAlumnos = alumnos.length;
        
        let metaCurso = 0;
        alumnos.forEach(a => {
            let cuota = parseFloat(a.valor_total_pagar || 0);
            let fiesta = (parseInt(a.adultos_fiesta || 0) * PRECIO_ADULTO) + (parseInt(a.ninos_fiesta || 0) * PRECIO_NINO);
            metaCurso += (cuota + fiesta);
        });
        
        const pagosCurso = pagosGlobales.filter(p => p.estado === 'VALIDADO' && usuariosBD.some(u => u.username === p.usuario && compararCursos(u.curso, curso)));
        const actsCurso = actividadesGlobales.filter(a => compararCursos(a.curso, curso));
        
        const recPagos = pagosCurso.reduce((s, p) => s + parseFloat(p.valor || 0), 0);
        const recActs = actsCurso.reduce((s, a) => s + parseFloat(a.valor || 0), 0);
        const totalRecaudado = recPagos + recActs;

        tc.innerHTML += `<tr>
            <td class="fw-bold" style="color: #1e3c72;">${curso}</td>
            <td class="fw-bold fs-6">${totalAlumnos}</td>
            <td class="fw-bold text-success fs-6">$${totalRecaudado.toFixed(2)}</td>
            <td class="fw-bold text-info fs-6">$${metaCurso.toFixed(2)}</td>
        </tr>`;

        if (contenedorBarras) {
            let porcentaje = metaCurso > 0 ? Math.round((totalRecaudado / metaCurso) * 100) : 0;
            if (porcentaje > 100) porcentaje = 100;
            let colorClase = 'bg-danger';
            if (porcentaje > 40) colorClase = 'bg-warning text-dark';
            if (porcentaje > 80) colorClase = 'bg-success';

            contenedorBarras.innerHTML += `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-end mb-1">
                    <span class="fw-bold text-dark" style="font-size: 0.9rem;">${curso}</span>
                    <span class="fw-bold text-muted" style="font-size: 0.8rem;">$${totalRecaudado.toFixed(2)} / $${metaCurso.toFixed(2)}</span>
                </div>
                <div class="progress" style="height: 20px; border-radius: 10px; background-color: #e9ecef;">
                    <div class="progress-bar ${colorClase} fw-bold" role="progressbar" style="width: ${porcentaje}%" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
                        ${porcentaje > 5 ? porcentaje + '%' : ''}
                    </div>
                </div>
            </div>`;
        }
    });
}

function abrirModalPagoPadre() {
    const selectPadre = document.getElementById('pago-usuario');
    const form = document.getElementById('form-pago');
    form.reset();
    limpiarFeedbackArchivos();
    
    if (usuarioActual.rol === 'PADRE') {
        selectPadre.innerHTML = `<option value="${usuarioActual.username}">${usuarioActual.nombre}</option>`;
        selectPadre.value = usuarioActual.username;
        selectPadre.style.pointerEvents = "none";
        selectPadre.style.backgroundColor = "#e9ecef";
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPago')).show();
}

function abrirModalFiestaPadre() {
    const userDatos = usuariosBD.find(u => u.username === usuarioActual.username);
    document.getElementById('padre-adultos').value = userDatos.adultos_fiesta || 0;
    document.getElementById('padre-ninos').value = userDatos.ninos_fiesta || 0;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFiestaPadre')).show();
}

async function guardarFiestaPadre(e) {
    e.preventDefault();
    const adultos = document.getElementById('padre-adultos').value;
    const ninos = document.getElementById('padre-ninos').value;
    try {
        const resp = await fetch(`${API_URL}/usuarios/fiesta/padre`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ username: usuarioActual.username, adultos: adultos, ninos: ninos }) 
        });
        const data = await resp.json();
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalFiestaPadre')).hide();
            mostrarAlerta("Confirmación de asistencia actualizada. Revise sus nuevos gastos asignados en el Estado de Cuenta.", "✅");
            actualizarDashboardPadre();
        } else { mostrarAlerta("Error al actualizar la asistencia.", "❌"); }
    } catch(err) { mostrarAlerta("Error de conexión al guardar asistencia.", "❌"); }
}

function actualizarDashboardPadre() {
    cargarDatosDesdeServidor().then(() => {
        const userDatos = usuariosBD.find(u => u.username === usuarioActual.username);
        const misPagos = pagosGlobales.filter(p => p.usuario === usuarioActual.username);
        const misActividades = actividadesGlobales.filter(a => compararCursos(a.curso, userDatos.curso) || a.curso.toUpperCase() === 'TODOS');
        
        let cuotaBase = parseFloat(userDatos.valor_total_pagar || 0);
        let cantAdultos = parseInt(userDatos.adultos_fiesta || 0);
        let cantNinos = parseInt(userDatos.ninos_fiesta || 0);
        let totalAdultos = cantAdultos * PRECIO_ADULTO;
        let totalNinos = cantNinos * PRECIO_NINO;
        
        let totalAPagar = cuotaBase + totalAdultos + totalNinos;
        let totalPagado = misPagos.filter(p => p.estado === 'VALIDADO').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
        let pendiente = totalAPagar - totalPagado;

        const vistaEstado = document.getElementById('padre-vista-estado');
        if (vistaEstado) {
            let transacciones = [];
            
            if (cuotaBase > 0) {
                transacciones.push({ fecha: '2024-01-01', concepto: 'Deuda Inicial / Cuota Base', ingreso: 0, gasto: cuotaBase, validado: true });
            }
            if (totalAdultos > 0) {
                transacciones.push({ fecha: '2024-01-02', concepto: `Fiesta Familiar - Adultos (${cantAdultos} x $${PRECIO_ADULTO.toFixed(2)})`, ingreso: 0, gasto: totalAdultos, validado: true });
            }
            if (totalNinos > 0) {
                transacciones.push({ fecha: '2024-01-02', concepto: `Fiesta Familiar - Niños (${cantNinos} x $${PRECIO_NINO.toFixed(2)})`, ingreso: 0, gasto: totalNinos, validado: true });
            }

            misPagos.forEach(p => {
                transacciones.push({
                    fecha: p.fecha,
                    comprobante: p.voucher || '-',
                    concepto: 'Abono / Transferencia Registrada',
                    ingreso: parseFloat(p.valor || 0),
                    gasto: 0,
                    validado: p.estado === 'VALIDADO'
                });
            });

            transacciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            let htmlFilas = '';
            let deudaActual = 0; 

            if (transacciones.length === 0) {
                htmlFilas = `<tr><td colspan="6" class="text-muted py-4">No hay movimientos en tu cuenta.</td></tr>`;
            } else {
                transacciones.forEach(t => {
                    if (t.validado) {
                        deudaActual += t.gasto;
                        deudaActual -= t.ingreso;
                    }
                    
                    let estadoEtiqueta = t.validado ? '' : '<br><span class="badge bg-warning text-dark mt-1 shadow-sm"><i class="bi bi-hourglass-split me-1"></i>En Espera de Aprobación</span>';
                    
                    htmlFilas += `<tr>
                        <td>${t.fecha}</td>
                        <td>${t.comprobante}</td>
                        <td class="fw-bold text-start">${t.concepto} ${estadoEtiqueta}</td>
                        <td class="text-success fw-bold">${t.ingreso > 0 ? '$'+t.ingreso.toFixed(2) : '-'}</td>
                        <td class="text-danger fw-bold">${t.gasto > 0 ? '$'+t.gasto.toFixed(2) : '-'}</td>
                        <td class="fw-bold ${t.validado ? 'text-primary' : 'text-muted'}">$${Math.max(0, deudaActual).toFixed(2)}</td>
                    </tr>`;
                });
            }

            vistaEstado.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-primary shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-wallet2 me-2"></i>Total Gastos Asignados</h6>
                                <h3 class="fw-bold mb-0" id="lbl-total-pagar">$${totalAPagar.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-success shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-piggy-bank-fill me-2"></i>Total Abonado (Aprobado)</h6>
                                <h3 class="fw-bold mb-0" id="lbl-pagado">$${totalPagado.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-danger shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-exclamation-triangle-fill me-2"></i>Saldo Pendiente (Deuda)</h6>
                                <h3 class="fw-bold mb-0" id="lbl-pendiente">$${Math.max(0, pendiente).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 border-bottom pb-2">
                    <h4 class="fw-bold text-primary mb-3 mb-md-0"><i class="bi bi-clock-history me-2"></i>Mi Estado de Cuenta</h4>
                    <div class="d-flex gap-2">
                        <button class="btn btn-dark fw-bold shadow-sm flex-fill" onclick="abrirModalFiestaPadre()"><i class="bi bi-balloon-fill me-1"></i> Invitados Fiesta</button>
                        <button class="btn btn-success fw-bold shadow-sm flex-fill" onclick="abrirModalPagoPadre()"><i class="bi bi-currency-dollar me-1"></i> Registrar Pago</button>
                    </div>
                </div>
                
                <div class="card shadow-sm mb-4">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle text-center mb-0">
                                <thead class="table-primary">
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Comprobante</th>
                                        <th>Mis Gastos / Mis Pagos</th>
                                        <th>Abonado (Ingreso)</th>
                                        <th>Deuda (Gasto)</th>
                                        <th>Saldo Pendiente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${htmlFilas}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        const vistaDocs = document.getElementById('padre-vista-documentos'); 
        if(vistaDocs) {
            const docsVisibles = contratosGlobales.filter(c => c.visible);
            
            let htmlContratos = docsVisibles.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay contratos públicos habilitados.</td></tr>` : '';
            docsVisibles.forEach(c => {
                const descripcionC = c.desc || c.descripcion || '';
                htmlContratos += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${descripcionC}</td><td><button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="verDocumentoPDF(${c.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Documento</button></td></tr>`;
            });

            let htmlActividades = misActividades.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay fondos recaudados en tu curso.</td></tr>` : '';
            misActividades.forEach(a => {
                const btnDoc = a.tiene_doc ? `<button class="btn btn-sm btn-outline-success fw-bold shadow-sm" onclick="verActividadPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Respaldo</button>` : '-';
                htmlActividades += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion} <br><small class="text-success">+$${parseFloat(a.valor||0).toFixed(2)}</small></td><td>${btnDoc}</td></tr>`;
            });

            let htmlActas = actasGlobales.length === 0 ? `<tr><td colspan="3" class="text-muted py-4">No hay actas de reuniones disponibles.</td></tr>` : '';
            actasGlobales.forEach(a => {
                htmlActas += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion}</td><td><button class="btn btn-sm btn-dark fw-bold shadow-sm" onclick="verActaPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Abrir Acta</button></td></tr>`;
            });

            vistaDocs.innerHTML = `
                <h4 class="fw-bold text-dark mb-4 border-bottom pb-2"><i class="bi bi-folder2-open-fill me-2"></i>Documentos y Registros</h4>
                
                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-primary text-white fw-bold"><i class="bi bi-file-earmark-text-fill me-2"></i>1. Contratos Vigentes</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlContratos}</tbody></table></div>
                </div>

                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-success text-white fw-bold"><i class="bi bi-cash-coin me-2"></i>2. Fondos Extra Recaudados (Tu Curso: ${userDatos.curso})</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlActividades}</tbody></table></div>
                </div>

                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-secondary text-white fw-bold"><i class="bi bi-briefcase-fill me-2"></i>3. Actas de Reuniones del Comité</div>
                    <div class="table-responsive"><table class="table table-hover align-middle text-center mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Descripción</th><th>Documento</th></tr></thead><tbody>${htmlActas}</tbody></table></div>
                </div>
            `;
        }

        const tbGastos = document.getElementById('tabla-egresos-padre');
        if (tbGastos) {
            tbGastos.innerHTML = '';
            if (!egresosGlobales || egresosGlobales.length === 0) {
                tbGastos.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay gastos registrados por el comité.</td></tr>`;
            } else {
                egresosGlobales.forEach(e => {
                    const btnDoc = e.tiene_doc ? `<button class="btn btn-sm btn-outline-danger fw-bold shadow-sm" onclick="verEgresoPDF(${e.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Factura</button>` : '-';
                    const estadoTexto = e.estado_pago || 'PENDIENTE';
                    const colorValor = estadoTexto === 'PAGADO' ? 'text-success' : 'text-danger';
                    const signo = estadoTexto === 'PAGADO' ? '' : '-';
                    
                    tbGastos.innerHTML += `<tr>
                        <td>${e.fecha}</td>
                        <td class="fw-bold text-dark text-start">${e.descripcion}</td>
                        <td class="fw-bold ${colorValor}">${signo}$${parseFloat(e.valor || 0).toFixed(2)}</td>
                        <td><span class="badge ${estadoTexto === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1">${estadoTexto}</span></td>
                        <td>${btnDoc}</td>
                    </tr>`;
                });
            }
        }

        setTimeout(hacerTablasResponsivas, 200);
    });
}

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
            
            const arr = b64.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--){ u8arr[n] = bstr.charCodeAt(n); }
            const blob = new Blob([u8arr], {type: mime});
            
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
            mostrarAlerta("Pago registrado exitosamente. Se encuentra en espera de aprobación.", "✅"); 
            
            if (usuarioActual.rol === 'PADRE') { actualizarDashboardPadre(); } 
            else { renderizarTodasLasTablasAdmin(); }
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
        
        const fiestaEl = document.getElementById('usu-fiesta');
        if(fiestaEl) fiestaEl.value = u.asiste_fiesta || 'NO';
        const adEl = document.getElementById('usu-adultos');
        if(adEl) adEl.value = u.adultos_fiesta || 0;
        const niEl = document.getElementById('usu-ninos');
        if(niEl) niEl.value = u.ninos_fiesta || 0;

        document.getElementById('div-usu-clave').classList.add('oculto'); 
        document.getElementById('usu-clave').required = false; 
        document.getElementById('titulo-modal-usuario').innerText = "Modificar Usuario";
    } else {
        form.reset(); 
        document.getElementById('usu-modo').value = "CREAR"; 
        document.getElementById('usu-id').readOnly = false;
        
        const fiestaEl = document.getElementById('usu-fiesta');
        if(fiestaEl) fiestaEl.value = 'NO';
        const adEl = document.getElementById('usu-adultos');
        if(adEl) adEl.value = 0;
        const niEl = document.getElementById('usu-ninos');
        if(niEl) niEl.value = 0;

        document.getElementById('div-usu-clave').classList.remove('oculto'); 
        document.getElementById('usu-clave').required = true; 
        document.getElementById('titulo-modal-usuario').innerText = "Nuevo Usuario";
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario')).show();
}

async function guardarUsuario(e) {
    e.preventDefault();
    const usuFiesta = document.getElementById('usu-fiesta') ? document.getElementById('usu-fiesta').value : 'NO';
    const usuAdultos = document.getElementById('usu-adultos') ? parseInt(document.getElementById('usu-adultos').value) || 0 : 0;
    const usuNinos = document.getElementById('usu-ninos') ? parseInt(document.getElementById('usu-ninos').value) || 0 : 0;

    const payload = { 
        username: document.getElementById('usu-id').value.trim(), 
        nombre: document.getElementById('usu-nombre').value, 
        rol: document.getElementById('usu-rol').value, 
        curso: document.getElementById('usu-curso').value, 
        password: document.getElementById('usu-clave').value,
        asiste_fiesta: usuFiesta,
        adultos_fiesta: usuAdultos,
        ninos_fiesta: usuNinos
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
    mostrarAlerta("Transferencia aprobada exitosamente.", "✅"); 
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
    mostrarAlerta("Cuota Base actualizada.", "✅"); 
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

async function marcarEgresoEstado(id, nuevoEstado) {
    try {
        const resp = await fetch(`${API_URL}/egresos/estado`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: id, estado: nuevoEstado }) 
        });
        const data = await resp.json();
        if (resp.ok && data.exito) {
            mostrarAlerta(`Egreso marcado como ${nuevoEstado}.`, "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al cambiar estado: " + data.mensaje, "❌");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión.", "❌");
    }
}

async function eliminarEgreso(id) {
    if(!confirm("¿Estás seguro de que quieres eliminar este egreso del comité permanentemente? Esta acción borrará el registro de la base de datos y no se puede deshacer.")) {
        return;
    }
    try {
        const resp = await fetch(`${API_URL}/egresos/${id}`, { method: 'DELETE' });
        const data = await resp.json();
        if (resp.ok && data.exito) {
            mostrarAlerta("Egreso eliminado permanentemente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al eliminar el egreso: " + data.mensaje, "❌");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión con la base de datos.", "❌");
    }
}