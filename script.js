let usuariosBD = [];
let pagosGlobales = [];
let ingresosGlobales = [];
let egresosGlobales = [];
let contratosGlobales = [];
let actasGlobales = [];
let actividadesGlobales = [];
let gastosPadres = [];
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
    if (formLogin) {
        if (!document.getElementById('marca-login-sfs')) {
            const marcaHTML = `
                <div id="marca-login-sfs" class="text-center mt-4 pt-3 border-top">
                    <p class="mb-0 fw-bold text-dark">SIGECO 28</p>
                    <p class="mb-0 text-muted small">Desarrollado por SmartFastSolution LATAM</p>
                    <a href="mailto:infosfs@sfslatams.com" class="text-success small text-decoration-none">infosfs@sfslatams.com</a>
                </div>
            `;
            formLogin.insertAdjacentHTML('beforeend', marcaHTML);
        }
        
        if (!document.getElementById('link-olvide-clave')) {
            const btnLogin = formLogin.querySelector('button[type="submit"]');
            if (btnLogin) {
                btnLogin.insertAdjacentHTML('afterend', `
                    <div class="text-center mt-3">
                        <a href="#" id="link-olvide-clave" class="text-decoration-none small fw-bold text-primary">¿Olvidaste tu contraseña?</a>
                    </div>
                `);
                document.getElementById('link-olvide-clave').addEventListener('click', (e) => {
                    e.preventDefault();
                    mostrarAlerta("Para restablecer su contraseña o reportar problemas de acceso, por favor envíe un correo al Administrador del sistema a: infosfs@sfslatams.com", "🔐");
                });
            }
        }
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

    if (document.getElementById('form-login')) {
        document.getElementById('form-login').addEventListener('submit', iniciarSesion);
    }
    if (document.getElementById('form-forzar-clave')) {
        document.getElementById('form-forzar-clave').addEventListener('submit', guardarClaveForzada);
    }
    if (document.getElementById('form-usuario')) {
        document.getElementById('form-usuario').addEventListener('submit', guardarUsuario);
    }
    if (document.getElementById('form-pago')) {
        document.getElementById('form-pago').addEventListener('submit', registrarPago);
    }
    if (document.getElementById('form-cuota')) {
        document.getElementById('form-cuota').addEventListener('submit', guardarNuevaCuota);
    }
    if (document.getElementById('form-contrato')) {
        document.getElementById('form-contrato').addEventListener('submit', (e) => subirDocumento(e, 'CONTRATO'));
    }
    if (document.getElementById('form-egreso')) {
        document.getElementById('form-egreso').addEventListener('submit', registrarEgreso);
    }
    if (document.getElementById('form-acta')) {
        document.getElementById('form-acta').addEventListener('submit', subirActa);
    }

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
        const fb = document.getElementById('feedback-' + input.id);
        if (fb) {
            fb.classList.add('oculto');
        }
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
        const resp = await fetch(`${API_URL}/datos?t=${new Date().getTime()}`);
        if (!resp.ok) {
            throw new Error("Error en la conexión con el servidor");
        }
        const data = await resp.json();
        
        usuariosBD = data.usuarios || []; 
        pagosGlobales = data.pagos || [];
        egresosGlobales = data.egresos || [];
        gastosPadres = data.gastos || [];
        contratosGlobales = data.contratos || [];
        actasGlobales = data.actas || [];
        actividadesGlobales = data.actividades || [];
        ingresosGlobales = data.ingresos || []; 
        
    } catch (e) {
        console.error(e);
        mostrarAlerta("Error al descargar la información de la base de datos. Recargue la página.", "❌");
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
                            <div class="mb-3">
                                <label class="fw-bold">Descripción (Ej. Rifa, Bingo)</label>
                                <input type="text" class="form-control" id="act-desc" required>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Fecha</label>
                                <input type="date" class="form-control" id="act-fecha" required>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Valor Recaudado ($)</label>
                                <input type="number" step="0.01" class="form-control" id="act-valor" required>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Respaldo (PDF - Máx 3MB)</label>
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
            } else { 
                fb.classList.add('oculto'); 
                this.classList.remove('is-valid'); 
            }
        });
    }

    if (!document.getElementById('modalGastosPadreAdmin')) {
        const modalGastosHTML = `
        <div class="modal fade" id="modalGastosPadreAdmin" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title"><i class="bi bi-bag-plus-fill me-2"></i>Asignar Nuevo Gasto a Padre</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-asignar-gasto">
                            <div class="alert alert-warning small">
                                Utiliza esta opción para cobrar ítems específicos (Ej. Abrigo, Anuario, Kit). 
                                Aparecerá como deuda en la cuenta del padre seleccionado.
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Asignar a:</label>
                                <select class="form-select" id="gasto-asignar-usuario" required>
                                    <option value="">-- Seleccione a quién cobrar --</option>
                                    <option value="TODOS" class="fw-bold text-danger">⚠️️ A TODOS LOS PADRES (COBRO GENERAL)</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Concepto (Ej. Anuario, Chompa, Abrigo)</label>
                                <input type="text" class="form-control" id="gasto-asignar-desc" required>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Fecha</label>
                                <input type="date" class="form-control" id="gasto-asignar-fecha" required>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Valor a Cobrar ($)</label>
                                <input type="number" step="0.01" class="form-control" id="gasto-asignar-valor" required>
                            </div>
                            <button type="submit" class="btn btn-danger w-100 fw-bold">Guardar Gasto (Crear Deuda)</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalGastosHTML);
        document.getElementById('form-asignar-gasto').addEventListener('submit', guardarNuevoGastoAdmin);
    }

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
                                <em>Nota: Configurar esto creará automáticamente un registro de deuda en "Mis Gastos Asignados".</em>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <label class="fw-bold">Cantidad Adultos</label>
                                    <input type="number" class="form-control" id="padre-adultos" min="0" value="0" required>
                                </div>
                                <div class="col-6">
                                    <label class="fw-bold">Cantidad Niños</label>
                                    <input type="number" class="form-control" id="padre-ninos" min="0" value="0" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold">Confirmar Asistencia</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalFiestaHTML);
        document.getElementById('form-fiesta-padre').addEventListener('submit', guardarFiestaPadre);
    }

    const adminPortal = document.getElementById('portal-admin');
    if (adminPortal && !document.getElementById('admin-modulo-gastospadres')) {
        const moduloGastosHTML = `
        <div id="admin-modulo-gastospadres" class="oculto mb-4">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 border-bottom pb-2">
                <h4 class="text-danger fw-bold mb-3 mb-md-0"><i class="bi bi-bag-x-fill me-2"></i>Control de Gastos (Deudas de Padres)</h4>
                <button class="btn btn-danger shadow-sm fw-bold" onclick="abrirModalGastoAdmin()">
                    <i class="bi bi-plus-circle me-1"></i> Asignar Gasto a Padre
                </button>
            </div>
            <div class="alert alert-secondary small">
                Aquí administras lo que <strong>cada padre</strong> tiene que pagar individualmente (ej. Abrigo, Foto, Fiesta). 
                Si te pagan un rubro específico, márcalo como PAGADO aquí.
            </div>
            <div class="table-responsive bg-white rounded shadow border p-3">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-danger">
                        <tr>
                            <th>Fecha</th>
                            <th>Padre de Familia</th>
                            <th>Concepto (Deuda)</th>
                            <th>Valor</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-gastos-admin"></tbody>
                </table>
            </div>
        </div>`;
        adminPortal.insertAdjacentHTML('afterbegin', moduloGastosHTML);
    }
}

async function iniciarSesion(e) {
    e.preventDefault();
    try {
        const bodyRequest = {
            username: document.getElementById('username').value.trim(), 
            password: document.getElementById('password').value
        };
        
        const resp = await fetch(`${API_URL}/login`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyRequest)
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
        mostrarAlerta("Error de conexión con el servidor. Intente más tarde.", "❌"); 
    }
}

async function guardarClaveForzada(e) {
    e.preventDefault();
    const nuevaClave = document.getElementById('nueva-clave-forzada').value;
    const bodyRequest = { 
        username: usuarioActual.username, 
        password: nuevaClave, 
        forzar: 0 
    };

    try {
        const resp = await fetch(`${API_URL}/usuarios/clave`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(bodyRequest) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito){
            usuarioActual.debe_cambiar_clave = 0;
            sessionStorage.setItem('sesionSIGECO', JSON.stringify(usuarioActual));
            
            bootstrap.Modal.getInstance(document.getElementById('modalForzarClave')).hide();
            document.getElementById('form-forzar-clave').reset();
            
            mostrarAlerta('Contraseña actualizada con éxito.', '🔐');
            cargarPortalSegunRol(usuarioActual);
        } else { 
            mostrarAlerta("Error al cambiar contraseña.", "❌"); 
        }
    } catch (error) {
        mostrarAlerta("Error de conexión al cambiar la contraseña.", "❌");
    }
}

function cargarPortalSegunRol(usuario) {
    usuarioActual = usuario;
    const errDiv = document.getElementById('mensaje-error');
    if(errDiv) {
        errDiv.classList.add('oculto');
    }
    
    document.getElementById('vista-login').classList.add('oculto');
    document.getElementById('vista-app').style.display = '';
    document.getElementById('vista-app').classList.remove('oculto');
    
    document.getElementById('nav-nombre-usuario').innerText = usuario.nombre;
    document.getElementById('badge-rol').innerText = usuario.rol;

    if (usuario.rol === 'ADMIN' || usuario.rol === 'COMITE') {
        let menuHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarModuloAdmin('resumen', this)"><i class="bi bi-grid-1x2-fill me-2"></i> Resumen General</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('gastospadres', this)"><i class="bi bi-bag-x-fill me-2"></i> Gastos a Padres (NUEVO)</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('pagos', this)"><i class="bi bi-journal-check me-2"></i> Control de Pagos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('egresos', this)"><i class="bi bi-cart-fill me-2"></i> Egresos Comité</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('curso', this)"><i class="bi bi-bar-chart-fill me-2"></i> Avance por Curso</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('actividades', this)"><i class="bi bi-cash-coin me-2"></i> Actividades Extra</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('contratos', this)"><i class="bi bi-file-earmark-text-fill me-2"></i> Contratos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('actas', this)"><i class="bi bi-briefcase-fill me-2"></i> Actas de Comité</a></li>
        `;
        
        if (usuario.rol === 'ADMIN') {
            menuHTML += `
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('usuarios', this)"><i class="bi bi-people-fill me-2"></i> Usuarios</a></li>
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('cuotas', this)"><i class="bi bi-wallet2 me-2"></i> Cuota Base</a></li>
            `;
        }
        
        document.getElementById('menu-navegacion').innerHTML = menuHTML;
        document.getElementById('portal-admin').classList.remove('oculto');
        
        if(document.getElementById('portal-padre')) {
            document.getElementById('portal-padre').classList.add('oculto');
        }
        
        actualizarSelectCursos();
        renderizarTodasLasTablasAdmin();
        cambiarModuloAdmin('resumen', document.querySelector('#menu-navegacion .nav-link')); 
        
    } else {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-2"></i> Mi Libro Mayor</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('misgastos', this)"><i class="bi bi-bag-x-fill me-2"></i> Mis Gastos Asignados</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('gastos', this)"><i class="bi bi-cart-x-fill me-2"></i> Egresos (Comité)</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open-fill me-2"></i> Documentos</a></li>
        `;
        
        const portalPadre = document.getElementById('portal-padre');
        
        if (portalPadre && !document.getElementById('padre-vista-misgastos')) {
            portalPadre.insertAdjacentHTML('beforeend', `
            <div id="padre-vista-misgastos" class="oculto">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 border-bottom pb-2">
                    <h4 class="fw-bold text-danger mb-3 mb-md-0"><i class="bi bi-bag-x-fill me-2"></i>Mis Gastos Asignados (Detalle)</h4>
                    <button class="btn btn-dark fw-bold shadow-sm" onclick="abrirModalFiestaPadre()">
                        <i class="bi bi-balloon-fill me-1"></i> Asistencia Fiesta Familiar
                    </button>
                </div>
                <div class="alert alert-info small">
                    Aquí puede ver el desglose de los rubros que debe pagar. Haga clic en <strong>Subir Pago</strong> para enviar su comprobante.
                </div>
                <div class="card shadow-sm mb-4">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle text-center mb-0">
                                <thead class="table-danger">
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Rubro / Concepto</th>
                                        <th>Valor a Pagar</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="tabla-misgastos-padre"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`);
        }

        if (portalPadre && !document.getElementById('padre-vista-gastos')) {
            portalPadre.insertAdjacentHTML('beforeend', `
            <div id="padre-vista-gastos" class="oculto">
                <h4 class="fw-bold text-secondary mb-4 border-bottom pb-2"><i class="bi bi-cart-x-fill me-2"></i>Transparencia: Gastos de la Directiva</h4>
                <div class="alert alert-warning small">
                    Estos son los gastos de la directiva con los fondos generales. <strong>No son deudas suyas.</strong>
                </div>
                <div class="card shadow-sm mb-4">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle text-center mb-0">
                                <thead class="table-secondary">
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Concepto de Gasto (Comité)</th>
                                        <th>Valor Pagado</th>
                                        <th>Estado</th>
                                        <th>Factura</th>
                                    </tr>
                                </thead>
                                <tbody id="tabla-egresos-padre"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`);
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
    location.reload();
}

function cerrarMenuMobile() {
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('.navbar-collapse');
    if (collapse && collapse.classList.contains('show')) {
        toggler.click();
    }
}

async function cambiarModuloAdmin(modulo, el) {
    document.querySelectorAll('#portal-admin > div').forEach(d => { 
        if(d.id && d.id.startsWith('admin-modulo-')) {
            d.classList.add('oculto'); 
        }
    });
    
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => {
        n.classList.remove('active');
    });
    
    if (document.getElementById(`admin-modulo-${modulo}`)) {
        document.getElementById(`admin-modulo-${modulo}`).classList.remove('oculto');
    }
    
    if (el) {
        el.classList.add('active');
    }
    
    cerrarMenuMobile();
    await renderizarTodasLasTablasAdmin();
}

async function cambiarVistaPadre(vista, el) {
    document.querySelectorAll('#portal-padre > div').forEach(d => {
        d.classList.add('oculto');
    });
    
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => {
        n.classList.remove('active');
    });
    
    if (document.getElementById(`padre-vista-${vista}`)) {
        document.getElementById(`padre-vista-${vista}`).classList.remove('oculto');
    }
    
    if(el) {
        el.classList.add('active');
    }
    
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
    
    const cursosBrutos = usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== '');
    const cursosUnicos = [...new Set(cursosBrutos)].sort();
    
    if(selectFiltro) {
        const valorActual = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="TODOS">Todos los Cursos (General)</option>';
        cursosUnicos.forEach(c => { 
            selectFiltro.innerHTML += `<option value="${c}">Solo mostrar ${c}</option>`; 
        });
        if(cursosUnicos.includes(valorActual)) {
            selectFiltro.value = valorActual;
        }
    }

    if(selectModal) {
        const valModal = selectModal.value;
        selectModal.innerHTML = `
            <option value="">-- Seleccione un Curso --</option>
            <option value="TODOS">🌐 Todos los Cursos (General)</option>
        `;
        cursosUnicos.forEach(c => { 
            selectModal.innerHTML += `<option value="${c}">${c}</option>`; 
        });
        if(cursosUnicos.includes(valModal) || valModal === "TODOS") {
            selectModal.value = valModal;
        }
    }
}

function abrirModalGastoAdmin() {
    document.getElementById('form-asignar-gasto').reset();
    const sel = document.getElementById('gasto-asignar-usuario');
    sel.innerHTML = `
        <option value="">-- Seleccione a quién cobrar --</option>
        <option value="TODOS" class="fw-bold text-danger">⚠️ A TODOS LOS PADRES</option>
    `;
    
    usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
        sel.innerHTML += `<option value="${u.username}">${u.nombre} (${u.curso||'Sin curso'})</option>`;
    });
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGastosPadreAdmin')).show();
}

async function guardarNuevoGastoAdmin(e) {
    e.preventDefault();
    const payload = {
        usuario: document.getElementById('gasto-asignar-usuario').value,
        concepto: document.getElementById('gasto-asignar-desc').value,
        fecha: document.getElementById('gasto-asignar-fecha').value,
        valor: parseFloat(document.getElementById('gasto-asignar-valor').value)
    };
    
    try {
        const resp = await fetch(`${API_URL}/gastos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalGastosPadreAdmin')).hide();
            mostrarAlerta("Gasto asignado exitosamente a la cuenta de los padres indicados.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al asignar el gasto: " + data.mensaje, "❌"); 
        }
    } catch(err) { 
        mostrarAlerta("Error de conexión al guardar el gasto.", "❌"); 
    }
}

async function cambiarEstadoGastoAdmin(id, nuevoEstado) {
    try {
        await fetch(`${API_URL}/gastos/estado`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id: id, estado: nuevoEstado }) 
        });
        renderizarTodasLasTablasAdmin();
    } catch (error) {
        mostrarAlerta("Error al cambiar el estado del gasto.", "❌");
    }
}

async function eliminarGastoAdmin(id) {
    if(!confirm("¿Borrar permanentemente este rubro de la deuda del padre? Esta acción no se puede deshacer.")) {
        return;
    }
    try {
        await fetch(`${API_URL}/gastos/${id}`, { method: 'DELETE' });
        mostrarAlerta("Deuda eliminada del sistema.", "✅");
        renderizarTodasLasTablasAdmin();
    } catch (error) {
        mostrarAlerta("Error al eliminar la deuda.", "❌");
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
    
    // TABLA GASTOS A PADRES
    const tgp = document.getElementById('tabla-gastos-admin');
    if(tgp) {
        tgp.innerHTML = '';
        if(gastosPadres.length === 0) {
            tgp.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No hay gastos asignados a los padres.</td></tr>`;
        } else {
            gastosPadres.forEach(g => {
                const userObj = usuariosBD.find(u => u.username === g.username);
                const nombreUser = userObj ? userObj.nombre : g.username;
                
                const btnSt = g.estado === 'PENDIENTE' 
                    ? `<button class="btn btn-sm btn-success fw-bold shadow-sm me-1" onclick="cambiarEstadoGastoAdmin(${g.id}, 'PAGADO')"><i class="bi bi-check2"></i> Pagar</button>`
                    : `<button class="btn btn-sm btn-warning fw-bold shadow-sm me-1" onclick="cambiarEstadoGastoAdmin(${g.id}, 'PENDIENTE')"><i class="bi bi-arrow-counterclockwise"></i> Revertir</button>`;
                
                let claseInsignia = g.estado === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark';

                tgp.innerHTML += `
                <tr>
                    <td>${g.fecha}</td>
                    <td class="fw-bold">${nombreUser}</td>
                    <td class="fw-bold text-dark text-start">${g.concepto}</td>
                    <td class="fw-bold text-danger">$${parseFloat(g.valor||0).toFixed(2)}</td>
                    <td><span class="badge ${claseInsignia}">${g.estado}</span></td>
                    <td>
                        <div class="d-flex justify-content-center">
                            ${btnSt} 
                            <button class="btn btn-sm btn-danger fw-bold shadow-sm" onclick="eliminarGastoAdmin(${g.id})"><i class="bi bi-trash-fill"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
    }

    // TABLA USUARIOS
    const tbU = document.getElementById('tabla-usuarios-admin'); 
    if(tbU) {
        tbU.innerHTML = '';
        usuariosParaRender.forEach(u => {
            let btnSt = u.estado === "ACTIVO" 
                ? `<button class="btn btn-sm btn-outline-danger fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-x-circle-fill me-1"></i>Desactivar</button>` 
                : `<button class="btn btn-sm btn-success fw-bold mt-1 mt-md-0 shadow-sm" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-check-circle-fill me-1"></i>Activar</button>`;
            
            let claseEstado = u.estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary';
            
            tbU.innerHTML += `
            <tr>
                <td class="text-primary fw-bold">${u.username}</td>
                <td>${u.nombre}</td>
                <td><span class="badge bg-primary px-2">${u.rol}</span></td>
                <td><span class="badge bg-dark">${u.curso||'-'}</span></td>
                <td><span class="badge ${claseEstado} px-2 py-1">${u.estado}</span></td>
                <td>
                    <div class="d-flex flex-column flex-md-row justify-content-center align-items-center">
                        <button class="btn btn-sm btn-primary fw-bold me-md-1 shadow-sm" onclick="abrirModalUsuario('${u.username}')"><i class="bi bi-pencil-fill me-1"></i>Editar</button>
                        ${btnSt}
                    </div>
                </td>
            </tr>`;
        });
    }
    
    // TABLA PAGOS
    const tp = document.getElementById('tabla-pagos'); 
    if(tp) {
        tp.innerHTML = '';
        if(pagosParaRender.length === 0) {
            tp.innerHTML = `<tr><td colspan="7" class="text-muted py-4">No hay pagos registrados.</td></tr>`;
        } else {
            pagosParaRender.forEach(p => {
                const datosUsuario = usuariosBD.find(u => u.username === p.usuario);
                const nombreCompleto = datosUsuario ? datosUsuario.nombre : p.usuario;
                
                const btnVoucher = p.tiene_voucher 
                    ? `<button class="btn btn-sm btn-info text-white fw-bold ms-2 shadow-sm" onclick="abrirVoucher(${p.id})"><i class="bi bi-image"></i> Voucher</button>` 
                    : '';
                
                let claseEstado = p.estado === 'VALIDADO' ? 'bg-success' : 'bg-warning text-dark';
                let btnAprobar = p.estado === 'PENDIENTE'
                    ? `<button class="btn btn-sm btn-primary shadow-sm fw-bold" onclick="validarPago(${p.id})">Aprobar</button>`
                    : '<i class="bi bi-check-circle-fill text-success fs-5"></i>';

                tp.innerHTML += `
                <tr>
                    <td class="fw-bold text-dark text-start">${nombreCompleto} <br><small class="text-muted">${datosUsuario?datosUsuario.curso:''}</small></td>
                    <td class="text-primary fw-bold">${p.usuario}</td>
                    <td>${p.fecha}</td>
                    <td>${p.voucher} ${btnVoucher}</td>
                    <td class="fw-bold text-success">$${parseFloat(p.valor || 0).toFixed(2)}</td>
                    <td><span class="badge ${claseEstado}">${p.estado}</span></td>
                    <td>${btnAprobar}</td>
                </tr>`;
            });
        }
    }

    // TABLA EGRESOS COMITÉ
    const te = document.getElementById('tabla-egresos');
    if(te) {
        te.innerHTML = '';
        if(egresosGlobales.length === 0) {
            te.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No hay egresos del comité.</td></tr>`;
        } else {
            egresosGlobales.forEach(e => {
                const btnDoc = e.tiene_doc 
                    ? `<button class="btn btn-sm btn-outline-danger shadow-sm fw-bold" onclick="verEgresoPDF(${e.id})">Factura</button>` 
                    : '-';
                
                const estadoActual = e.estado_pago || 'PENDIENTE';
                
                const btnEstado = estadoActual === 'PENDIENTE' 
                    ? `<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="marcarEgresoEstado(${e.id}, 'PAGADO')">Pagar</button>`
                    : `<button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="marcarEgresoEstado(${e.id}, 'PENDIENTE')">Revertir</button>`;
                
                let claseEstado = estadoActual === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark';

                te.innerHTML += `
                <tr>
                    <td>${e.fecha}</td>
                    <td class="fw-bold text-dark">${e.descripcion}</td>
                    <td>${e.proveedor}</td>
                    <td class="fw-bold text-danger">-$${parseFloat(e.valor || 0).toFixed(2)}</td>
                    <td><span class="badge ${claseEstado}">${estadoActual}</span></td>
                    <td>
                        <div class="d-flex gap-1 justify-content-center">
                            ${btnDoc} 
                            ${btnEstado} 
                            <button class="btn btn-sm btn-danger shadow-sm" onclick="eliminarEgreso(${e.id})"><i class="bi bi-trash-fill"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
    }

    // TABLA CUOTAS
    const tc = document.getElementById('tabla-cuotas'); 
    if(tc) {
        tc.innerHTML = '';
        usuariosParaRender.filter(u => u.rol === 'PADRE').forEach(u => {
            const cuotaBase = parseFloat(u.valor_total_pagar || 0);
            
            // Sumar todos los gastos de este padre
            const misGastos = gastosPadres.filter(g => g.username === u.username);
            const totalGastosRubros = misGastos.reduce((s, g) => s + parseFloat(g.valor||0), 0);
            const totalDeuda = cuotaBase + totalGastosRubros; 
            
            const pagosPadre = pagosGlobales.filter(p => p.usuario === u.username && p.estado === 'VALIDADO');
            const totalPagadoPadre = pagosPadre.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
            const saldoPadre = totalDeuda - totalPagadoPadre;

            tc.innerHTML += `
            <tr>
                <td class="text-primary fw-bold">${u.username}</td>
                <td>${u.nombre}</td>
                <td>
                    <div class="small">Cuota Base: $${cuotaBase.toFixed(2)}</div>
                    <div class="small text-muted">Rubros Extra: $${totalGastosRubros.toFixed(2)}</div>
                    <div class="fw-bold text-dark border-top pt-1 mt-1">Total a Pagar: $${totalDeuda.toFixed(2)}</div>
                </td>
                <td>
                    <div class="small text-success mb-1">Total Abonado: $${totalPagadoPadre.toFixed(2)}</div>
                    <div class="fw-bold text-danger border-top pt-1">Saldo Pendiente: $${saldoPadre.toFixed(2)}</div>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning fw-bold shadow-sm" onclick="abrirModalCuota('${u.username}', ${cuotaBase})">
                        <i class="bi bi-pencil-fill me-1"></i>Base
                    </button>
                </td>
            </tr>`;
        });
    }

    // TABLA ACTAS
    const ta = document.getElementById('tabla-actas');
    if(ta) {
        ta.innerHTML = '';
        if(actasGlobales.length === 0) {
            ta.innerHTML = `<tr><td colspan="3" class="text-muted py-4">No hay actas registradas.</td></tr>`;
        } else {
            actasGlobales.forEach(a => {
                const btnDoc = a.tiene_doc 
                    ? `<button class="btn btn-sm btn-dark fw-bold shadow-sm" onclick="verActaPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Abrir Acta</button>` 
                    : '-';
                ta.innerHTML += `
                <tr>
                    <td>${a.fecha}</td>
                    <td class="fw-bold text-dark">${a.descripcion}</td>
                    <td>${btnDoc}</td>
                </tr>`;
            });
        }
    }

    // TABLA ACTIVIDADES
    const tact = document.getElementById('tabla-actividades');
    if(tact) {
        tact.innerHTML = '';
        if(actividadesParaRender.length === 0) {
            tact.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay actividades registradas en este curso.</td></tr>`;
        } else {
            actividadesParaRender.forEach(a => {
                const btnDoc = a.tiene_doc 
                    ? `<button class="btn btn-sm btn-outline-success fw-bold shadow-sm" onclick="verActividadPDF(${a.id})"><i class="bi bi-file-pdf-fill me-1"></i>Ver Respaldo</button>` 
                    : '-';
                
                tact.innerHTML += `
                <tr>
                    <td>${a.fecha}</td>
                    <td class="fw-bold"><span class="badge bg-dark">${a.curso}</span></td>
                    <td class="fw-bold text-dark">${a.descripcion}</td>
                    <td class="fw-bold text-success">+$${parseFloat(a.valor || 0).toFixed(2)}</td>
                    <td>${btnDoc}</td>
                </tr>`;
            });
        }
    }

    // TABLA CONTRATOS
    const tbDocs = document.getElementById('tabla-contratos'); 
    if(tbDocs) {
        tbDocs.innerHTML = '';
        if (contratosGlobales.length === 0) {
            tbDocs.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay contratos registrados.</td></tr>`;
        } else {
            contratosGlobales.forEach(c => {
                const descripcionC = c.desc || c.descripcion || '';
                const proveedorC = c.prov || c.proveedor || '';
                const checkStatus = c.visible ? 'checked' : '';
                const btnVisible = `
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input" type="checkbox" ${checkStatus} onchange="toggleVisibleDoc(${c.id}, this.checked)">
                    </div>`;
                
                tbDocs.innerHTML += `
                <tr>
                    <td>${c.fecha}</td>
                    <td class="fw-bold text-dark">${descripcionC}</td>
                    <td>${proveedorC}</td>
                    <td class="fw-bold text-success">$${parseFloat(c.valor || 0).toFixed(2)}</td>
                    <td>${btnVisible}</td>
                </tr>`;
            });
        }
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
    let usuariosParaMeta = (cursoFiltroActual === "TODOS") 
        ? usuariosBD.filter(u => u.rol === 'PADRE') 
        : usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, cursoFiltroActual));
    
    usuariosParaMeta.forEach(u => {
        let cuota = parseFloat(u.valor_total_pagar || 0);
        let gastosPadre = gastosPadres.filter(g => g.username === u.username).reduce((s, g) => s + parseFloat(g.valor||0), 0);
        metaTotal += (cuota + gastosPadre);
    });
    
    if(document.getElementById('dash-ingresos')) {
        document.getElementById('dash-ingresos').innerText = `$${totalIngresos.toFixed(2)}`;
    }
    if(document.getElementById('dash-egresos')) {
        document.getElementById('dash-egresos').innerText = `$${totalEgresos.toFixed(2)}`;
    }
    if(document.getElementById('dash-saldo')) {
        document.getElementById('dash-saldo').innerText = `$${(totalIngresos - totalEgresos).toFixed(2)}`;
    }
    if(document.getElementById('dash-meta')) {
        document.getElementById('dash-meta').innerText = `$${metaTotal.toFixed(2)}`;
    }
}

function renderizarDashboardCurso() {
    const tc = document.getElementById('tabla-dashboard-curso');
    if(!tc) return;
    
    const cursosBrutos = usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== '');
    let cursosUnicos = [...new Set(cursosBrutos)].sort();
    
    if(cursoFiltroActual !== "TODOS") {
        cursosUnicos = cursosUnicos.filter(c => compararCursos(c, cursoFiltroActual));
    }

    tc.innerHTML = '';
    
    if(cursosUnicos.length === 0) { 
        tc.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay datos.</td></tr>`; 
        return; 
    }

    cursosUnicos.forEach(curso => {
        const alumnos = usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, curso));
        let metaCurso = 0;
        
        alumnos.forEach(a => {
            let cuota = parseFloat(a.valor_total_pagar || 0);
            let gPadre = gastosPadres.filter(g => g.username === a.username).reduce((s, g) => s + parseFloat(g.valor||0), 0);
            metaCurso += (cuota + gPadre);
        });
        
        const recPagos = pagosGlobales.filter(p => p.estado === 'VALIDADO' && usuariosBD.some(u => u.username === p.usuario && compararCursos(u.curso, curso))).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
        const recActs = actividadesGlobales.filter(a => compararCursos(a.curso, curso)).reduce((s, a) => s + parseFloat(a.valor || 0), 0);
        const totalRecaudado = recPagos + recActs;

        tc.innerHTML += `
        <tr>
            <td class="fw-bold" style="color:#1e3c72;">${curso}</td>
            <td class="fw-bold">${alumnos.length}</td>
            <td class="fw-bold text-success">$${totalRecaudado.toFixed(2)}</td>
            <td class="fw-bold text-info">$${metaCurso.toFixed(2)}</td>
        </tr>`;
    });
}

function abrirModalPagoPrellenado(valorPredeterminado = null) {
    const form = document.getElementById('form-pago');
    form.reset(); 
    limpiarFeedbackArchivos();
    
    const sel = document.getElementById('pago-usuario');
    
    if (usuarioActual.rol === 'PADRE') {
        sel.innerHTML = `<option value="${usuarioActual.username}">${usuarioActual.nombre}</option>`;
        sel.value = usuarioActual.username;
        sel.style.pointerEvents = "none"; 
        sel.style.backgroundColor = "#e9ecef";
    }
    
    if(valorPredeterminado) {
        document.getElementById('pago-valor').value = parseFloat(valorPredeterminado).toFixed(2);
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
    const payload = { 
        username: usuarioActual.username, 
        adultos: document.getElementById('padre-adultos').value, 
        ninos: document.getElementById('padre-ninos').value 
    };

    try {
        const resp = await fetch(`${API_URL}/usuarios/fiesta/padre`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalFiestaPadre')).hide();
            mostrarAlerta("Confirmación de Fiesta Familiar guardada. Revise sus rubros en Mis Gastos Asignados.", "✅");
            actualizarDashboardPadre();
        } else { 
            mostrarAlerta("Error al actualizar la asistencia.", "❌"); 
        }
    } catch(err) { 
        mostrarAlerta("Error de conexión al guardar asistencia.", "❌"); 
    }
}

function actualizarDashboardPadre() {
    cargarDatosDesdeServidor().then(() => {
        const userDatos = usuariosBD.find(u => u.username === usuarioActual.username);
        const misPagos = pagosGlobales.filter(p => p.usuario === usuarioActual.username);
        const misGastos = gastosPadres.filter(g => g.username === usuarioActual.username);
        
        let cuotaBase = parseFloat(userDatos.valor_total_pagar || 0);
        let totalRubros = misGastos.reduce((s, g) => s + parseFloat(g.valor||0), 0);
        
        let totalAPagar = cuotaBase + totalRubros;
        let totalPagado = misPagos.filter(p => p.estado === 'VALIDADO').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
        let pendiente = totalAPagar - totalPagado;

        // VISTA 1: MIS GASTOS DETALLADOS
        const vistaMisGastos = document.getElementById('tabla-misgastos-padre');
        if(vistaMisGastos) {
            vistaMisGastos.innerHTML = '';
            
            if (cuotaBase > 0) {
                vistaMisGastos.innerHTML += `
                <tr>
                    <td>-</td>
                    <td class="fw-bold text-dark text-start">Cuota Base (Anual)</td>
                    <td class="fw-bold text-danger">$${cuotaBase.toFixed(2)}</td>
                    <td><span class="badge bg-secondary">DEUDA INICIAL</span></td>
                    <td>
                        <button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="abrirModalPagoPrellenado(${cuotaBase})">
                            <i class="bi bi-upload"></i> Subir Pago
                        </button>
                    </td>
                </tr>`;
            }
            
            if (misGastos.length === 0 && cuotaBase === 0) { 
                vistaMisGastos.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No tiene rubros asignados.</td></tr>`; 
            }
            
            misGastos.forEach(g => {
                const badgeEst = g.estado === 'PAGADO' 
                    ? '<span class="badge bg-success">PAGADO</span>' 
                    : '<span class="badge bg-warning text-dark">PENDIENTE</span>';
                
                const btnAcc = g.estado === 'PENDIENTE' 
                    ? `<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="abrirModalPagoPrellenado(${g.valor})"><i class="bi bi-upload"></i> Subir Pago</button>`
                    : `<i class="bi bi-check-circle-fill text-success fs-5"></i>`;
                
                vistaMisGastos.innerHTML += `
                <tr>
                    <td>${g.fecha}</td>
                    <td class="fw-bold text-dark text-start">${g.concepto}</td>
                    <td class="fw-bold text-danger">$${parseFloat(g.valor||0).toFixed(2)}</td>
                    <td>${badgeEst}</td>
                    <td>${btnAcc}</td>
                </tr>`;
            });
        }

        // VISTA 2: LIBRO MAYOR (ESTADO DE CUENTA CRONOLÓGICO)
        const vistaEstado = document.getElementById('padre-vista-estado');
        if (vistaEstado) {
            let transacciones = [];
            
            if (cuotaBase > 0) {
                transacciones.push({ fecha: '2024-01-01', concepto: 'Deuda Inicial / Cuota Base', ingreso: 0, gasto: cuotaBase, validado: true });
            }
            
            misGastos.forEach(g => {
                transacciones.push({ fecha: g.fecha, concepto: `Gasto Asignado: ${g.concepto}`, ingreso: 0, gasto: parseFloat(g.valor||0), validado: true });
            });
            
            misPagos.forEach(p => {
                transacciones.push({ fecha: p.fecha, comprobante: p.voucher || '-', concepto: 'Abono / Transferencia Registrada', ingreso: parseFloat(p.valor || 0), gasto: 0, validado: p.estado === 'VALIDADO' });
            });

            transacciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            let htmlFilas = '';
            let deudaActual = 0; 
            
            if (transacciones.length === 0) { 
                htmlFilas = `<tr><td colspan="6" class="text-muted py-4">No hay movimientos.</td></tr>`; 
            } else {
                transacciones.forEach(t => {
                    if (t.validado) { 
                        deudaActual += t.gasto; 
                        deudaActual -= t.ingreso; 
                    }
                    
                    let estadoEtiqueta = t.validado ? '' : '<br><span class="badge bg-warning text-dark mt-1"><i class="bi bi-hourglass-split me-1"></i>En Espera de Aprobación</span>';
                    let ingresoTexto = t.ingreso > 0 ? '$'+t.ingreso.toFixed(2) : '-';
                    let gastoTexto = t.gasto > 0 ? '$'+t.gasto.toFixed(2) : '-';
                    let saldoTexto = '$' + Math.max(0, deudaActual).toFixed(2);
                    let claseSaldo = t.validado ? 'text-primary' : 'text-muted';

                    htmlFilas += `
                    <tr>
                        <td>${t.fecha}</td>
                        <td>${t.comprobante || '-'}</td>
                        <td class="fw-bold text-start">${t.concepto} ${estadoEtiqueta}</td>
                        <td class="text-success fw-bold">${ingresoTexto}</td>
                        <td class="text-danger fw-bold">${gastoTexto}</td>
                        <td class="fw-bold ${claseSaldo}">${saldoTexto}</td>
                    </tr>`;
                });
            }

            vistaEstado.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-primary shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-wallet2 me-2"></i>Total Gastos Asignados</h6>
                                <h3 class="fw-bold mb-0">$${totalAPagar.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-success shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-piggy-bank-fill me-2"></i>Total Abonado (Aprobado)</h6>
                                <h3 class="fw-bold mb-0">$${totalPagado.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-danger shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-exclamation-triangle-fill me-2"></i>Saldo Pendiente (Deuda)</h6>
                                <h3 class="fw-bold mb-0">$${Math.max(0, pendiente).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 border-bottom pb-2">
                    <h4 class="fw-bold text-primary mb-3 mb-md-0"><i class="bi bi-clock-history me-2"></i>Mi Libro Mayor</h4>
                    <button class="btn btn-success fw-bold shadow-sm" onclick="abrirModalPagoPrellenado()">
                        <i class="bi bi-currency-dollar me-1"></i> Registrar Abono Libre
                    </button>
                </div>
                <div class="card shadow-sm mb-4">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle text-center mb-0">
                                <thead class="table-primary">
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Voucher</th>
                                        <th>Concepto</th>
                                        <th>Ingreso</th>
                                        <th>Gasto</th>
                                        <th>Saldo</th>
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

        // VISTA 3: EGRESOS COMITÉ
        const tbGastos = document.getElementById('tabla-egresos-padre');
        if (tbGastos) {
            tbGastos.innerHTML = '';
            if (egresosGlobales.length === 0) {
                tbGastos.innerHTML = `<tr><td colspan="5" class="text-muted py-4">Sin egresos registrados.</td></tr>`;
            } else {
                egresosGlobales.forEach(e => {
                    const btnDoc = e.tiene_doc 
                        ? `<button class="btn btn-sm btn-outline-danger shadow-sm" onclick="verEgresoPDF(${e.id})">Factura</button>` 
                        : '-';
                    const estadoTexto = e.estado_pago || 'PENDIENTE';
                    let claseEstado = estadoTexto === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark';
                    
                    tbGastos.innerHTML += `
                    <tr>
                        <td>${e.fecha}</td>
                        <td class="fw-bold text-dark text-start">${e.descripcion}</td>
                        <td class="fw-bold text-danger">-$${parseFloat(e.valor || 0).toFixed(2)}</td>
                        <td><span class="badge ${claseEstado}">${estadoTexto}</span></td>
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
                else if (b64.startsWith('/9j/') || b64.startsWith('iVBOR')) b64 = 'data:image/jpeg;base64,' + b64;
                else b64 = 'data:application/pdf;base64,' + b64; 
            }
            
            const arr = b64.split(','); 
            const mime = arr[0].match(/:(.*?);/)[1]; 
            const bstr = atob(arr[1]);
            
            let n = bstr.length; 
            const u8arr = new Uint8Array(n); 
            
            while(n--) { 
                u8arr[n] = bstr.charCodeAt(n); 
            }
            
            const blob = new Blob([u8arr], {type: mime}); 
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); 
            
            a.href = blobUrl; 
            a.download = nombreDefault; 
            document.body.appendChild(a); 
            a.click(); 
            document.body.removeChild(a); 
            window.URL.revokeObjectURL(blobUrl);
            
        } else { 
            mostrarAlerta("Documento no encontrado o corrupto.", "❌"); 
        }
    } catch (e) { 
        mostrarAlerta("Error al descargar el archivo desde el servidor.", "❌"); 
    }
}

function abrirVoucher(id) { 
    descargarArchivoInmune(`${API_URL}/pagos/ver/${id}?t=${new Date().getTime()}`, `voucher_pago_${id}.jpg`); 
}
function verDocumentoPDF(id) { 
    descargarArchivoInmune(`${API_URL}/documentos/ver/${id}?t=${new Date().getTime()}`, `contrato_${id}.pdf`); 
}
function verActaPDF(id) { 
    descargarArchivoInmune(`${API_URL}/actas/ver/${id}?t=${new Date().getTime()}`, `acta_${id}.pdf`); 
}
function verEgresoPDF(id) { 
    descargarArchivoInmune(`${API_URL}/egresos/ver/${id}?t=${new Date().getTime()}`, `factura_${id}.pdf`); 
}
function verActividadPDF(id) { 
    descargarArchivoInmune(`${API_URL}/actividades/ver/${id}?t=${new Date().getTime()}`, `respaldo_${id}.pdf`); 
}

function leerArchivoComoBase64(file) { 
    return new Promise((res, rej) => { 
        if(file.size > 3500000) { 
            mostrarAlerta("Archivo muy pesado (Max 3MB).", "⚠️"); 
            rej("Pesado"); 
            return; 
        }
        const r = new FileReader(); 
        r.onload = () => res(r.result); 
        r.onerror = (error) => rej(error);
        r.readAsDataURL(file); 
    }); 
}

async function registrarPago(e) { 
    e.preventDefault(); 
    let vB64 = "";
    const fileInput = document.getElementById('pago-voucher-file');
    
    if(fileInput && fileInput.files[0]) { 
        if(!fileInput.files[0].type.match('image/jpeg')) { 
            mostrarAlerta("Solo formato JPG o JPEG está permitido para comprobantes.", "⚠️"); 
            return; 
        }
        try {
            vB64 = await leerArchivoComoBase64(fileInput.files[0]); 
        } catch (error) {
            return;
        }
    }
    
    const payload = { 
        usuario: document.getElementById('pago-usuario').value, 
        fecha: document.getElementById('pago-fecha').value, 
        voucher: document.getElementById('pago-voucher').value, 
        valor: parseFloat(document.getElementById('pago-valor').value), 
        voucher_b64: vB64 
    }; 
    
    try {
        const resp = await fetch(`${API_URL}/pagos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalPago')).hide(); 
            document.getElementById('form-pago').reset(); 
            limpiarFeedbackArchivos();
            
            mostrarAlerta("Pago registrado exitosamente. En espera de aprobación del administrador.", "✅"); 
            
            if (usuarioActual.rol === 'PADRE') {
                actualizarDashboardPadre();
            } else {
                renderizarTodasLasTablasAdmin(); 
            }
        } else { 
            mostrarAlerta("Error al registrar pago: " + data.mensaje, "❌"); 
        }
    } catch(err) { 
        mostrarAlerta("Error de conexión al subir el pago.", "❌"); 
    }
}

async function validarPago(id) { 
    try {
        const payload = { id: id };
        const resp = await fetch(`${API_URL}/pagos/validar`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            mostrarAlerta("Transferencia verificada y aprobada.", "✅"); 
            renderizarTodasLasTablasAdmin(); 
        } else { 
            mostrarAlerta("Error al validar la transferencia: " + data.mensaje, "❌"); 
        }
    } catch(err) { 
        mostrarAlerta("Error de conexión.", "❌"); 
    }
}

async function registrarActividad(e) { 
    e.preventDefault();
    const file = document.getElementById('act-file').files[0];
    
    if(!file) { 
        mostrarAlerta("Debes adjuntar el archivo PDF de respaldo obligatoriamente.", "⚠️"); 
        return; 
    }
    
    let b64 = "";
    try { 
        b64 = await leerArchivoComoBase64(file); 
    } catch(err) { 
        return; 
    }
    
    const payload = {
        curso: document.getElementById('act-curso').value.trim(),
        descripcion: document.getElementById('act-desc').value.trim(),
        fecha: document.getElementById('act-fecha').value,
        valor: parseFloat(document.getElementById('act-valor').value),
        archivoNombre: file.name,
        archivoData: b64
    };
    
    try {
        const resp = await fetch(`${API_URL}/actividades`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalActividad')).hide();
            document.getElementById('form-actividad').reset();
            limpiarFeedbackArchivos();
            
            mostrarAlerta("Ingreso por Actividad guardado y registrado correctamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al subir actividad: " + data.mensaje, "❌"); 
        }
    } catch(error) { 
        mostrarAlerta("Error de conexión.", "❌"); 
    }
}

async function registrarEgreso(e) {
    e.preventDefault();
    const file = document.getElementById('egreso-file').files[0];
    let b64 = "";
    let fileName = "";
    
    if(file) { 
        try { 
            b64 = await leerArchivoComoBase64(file); 
            fileName = file.name; 
        } catch(err) { 
            return; 
        } 
    }
    
    const payload = { 
        fecha: document.getElementById('egreso-fecha').value, 
        descripcion: document.getElementById('egreso-desc').value, 
        proveedor: document.getElementById('egreso-prov').value, 
        valor: parseFloat(document.getElementById('egreso-valor').value), 
        archivoNombre: fileName, 
        archivoData: b64 
    };
    
    try {
        const resp = await fetch(`${API_URL}/egresos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalEgreso')).hide(); 
            document.getElementById('form-egreso').reset();
            limpiarFeedbackArchivos();
            
            mostrarAlerta("Egreso del Comité registrado en la base de datos.", "✅"); 
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al registrar egreso: " + data.mensaje, "❌"); 
        }
    } catch(error) { 
        mostrarAlerta("Error de conexión al registrar egreso.", "❌"); 
    }
}

async function subirActa(e) { 
    e.preventDefault();
    const file = document.getElementById('acta-file').files[0];
    
    if(!file) { 
        mostrarAlerta("Por favor, selecciona un documento PDF obligatoriamente.", "⚠️"); 
        return; 
    }
    
    let b64 = "";
    try { 
        b64 = await leerArchivoComoBase64(file); 
    } catch(err) { 
        return; 
    }
    
    const payload = {
        fecha: document.getElementById('acta-fecha').value,
        descripcion: document.getElementById('acta-desc').value,
        archivoNombre: file.name,
        archivoData: b64
    };
    
    try {
        const resp = await fetch(`${API_URL}/actas`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalActa')).hide();
            document.getElementById('form-acta').reset();
            limpiarFeedbackArchivos();
            
            mostrarAlerta("Acta subida correctamente al sistema.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al subir el acta: " + data.mensaje, "❌"); 
        }
    } catch(error) { 
        mostrarAlerta("Error de conexión.", "❌"); 
    }
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

        if(document.getElementById('usu-fiesta')) {
            document.getElementById('usu-fiesta').value = u.asiste_fiesta || 'NO';
        }
        if(document.getElementById('usu-adultos')) {
            document.getElementById('usu-adultos').value = u.adultos_fiesta || 0;
        }
        if(document.getElementById('usu-ninos')) {
            document.getElementById('usu-ninos').value = u.ninos_fiesta || 0;
        }

        document.getElementById('div-usu-clave').classList.add('oculto'); 
        document.getElementById('usu-clave').required = false; 
    } else {
        form.reset(); 
        document.getElementById('usu-modo').value = "CREAR"; 
        document.getElementById('usu-id').readOnly = false;

        if(document.getElementById('usu-fiesta')) {
            document.getElementById('usu-fiesta').value = 'NO';
        }
        if(document.getElementById('usu-adultos')) {
            document.getElementById('usu-adultos').value = 0;
        }
        if(document.getElementById('usu-ninos')) {
            document.getElementById('usu-ninos').value = 0;
        }

        document.getElementById('div-usu-clave').classList.remove('oculto'); 
        document.getElementById('usu-clave').required = true; 
    }
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario')).show(); 
}

async function guardarUsuario(e) { 
    e.preventDefault(); 
    
    let asisteFiestaValue = 'NO';
    if(document.getElementById('usu-fiesta')) {
        asisteFiestaValue = document.getElementById('usu-fiesta').value;
    }
    
    let adultosFiestaValue = 0;
    if(document.getElementById('usu-adultos')) {
        adultosFiestaValue = parseInt(document.getElementById('usu-adultos').value) || 0;
    }
    
    let ninosFiestaValue = 0;
    if(document.getElementById('usu-ninos')) {
        ninosFiestaValue = parseInt(document.getElementById('usu-ninos').value) || 0;
    }
    
    const payload = { 
        username: document.getElementById('usu-id').value.trim(), 
        nombre: document.getElementById('usu-nombre').value, 
        rol: document.getElementById('usu-rol').value, 
        curso: document.getElementById('usu-curso').value, 
        password: document.getElementById('usu-clave').value,
        asiste_fiesta: asisteFiestaValue,
        adultos_fiesta: adultosFiestaValue,
        ninos_fiesta: ninosFiestaValue
    };
    
    try {
        const isCrear = document.getElementById('usu-modo').value === "CREAR";
        const method = isCrear ? 'POST' : 'PUT';
        
        const resp = await fetch(`${API_URL}/usuarios`, { 
            method: method, 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
            mostrarAlerta("Usuario guardado y registrado exitosamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al guardar el usuario: " + data.mensaje, "❌"); 
        }
    } catch(error) { 
        mostrarAlerta("Error de conexión al guardar usuario.", "❌"); 
    }
}

async function toggleEstadoUsuario(username) { 
    try {
        const u = usuariosBD.find(x => x.username === username);
        const nuevoEstado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
        
        const payload = { 
            username: username, 
            estado: nuevoEstado 
        };
        
        await fetch(`${API_URL}/usuarios/estado`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        
        renderizarTodasLasTablasAdmin(); 
    } catch(err) { 
        mostrarAlerta("Error al cambiar el estado del usuario.", "❌"); 
    }
}

function abrirModalCuota(user, val) { 
    document.getElementById('cuota-usu').value = user; 
    document.getElementById('nueva-cuota-input').value = parseFloat(val).toFixed(2); 
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAsignarCuota')).show(); 
}

async function guardarNuevaCuota(e) { 
    e.preventDefault(); 
    const payload = { 
        username: document.getElementById('cuota-usu').value, 
        valor: parseFloat(document.getElementById('nueva-cuota-input').value) 
    };
    
    try {
        const resp = await fetch(`${API_URL}/usuarios/cuota`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalAsignarCuota')).hide(); 
            mostrarAlerta("La Cuota Base del estudiante ha sido actualizada.", "✅");
            renderizarTodasLasTablasAdmin(); 
        } else { 
            mostrarAlerta("Error al actualizar la cuota base.", "❌"); 
        }
    } catch(err) { 
        mostrarAlerta("Error de conexión.", "❌"); 
    }
}

async function subirDocumento(e, tipo) { 
    e.preventDefault(); 
    const file = document.getElementById('ctr-file').files[0];
    
    if(!file) { 
        mostrarAlerta("Por favor, selecciona un documento obligatoriamente.", "⚠️"); 
        return; 
    }
    
    let b64 = "";
    try { 
        b64 = await leerArchivoComoBase64(file); 
    } catch(err) { 
        return; 
    }
    
    const payload = {
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
        const resp = await fetch(`${API_URL}/documentos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        const data = await resp.json();
        
        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide();
            document.getElementById('form-contrato').reset();
            limpiarFeedbackArchivos();
            
            mostrarAlerta("Contrato guardado y subido exitosamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else { 
            mostrarAlerta("Error al guardar el contrato: " + data.mensaje, "❌"); 
        }
    } catch(error) { 
        mostrarAlerta("Error de conexión.", "❌"); 
    }
}

async function toggleVisibleDoc(id, val) { 
    try {
        const payload = { 
            id: id, 
            visible: val ? 1 : 0 
        };
        
        await fetch(`${API_URL}/documentos/visible`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        
        renderizarTodasLasTablasAdmin(); 
    } catch(err) { 
        mostrarAlerta("Error al cambiar la visibilidad del documento.", "❌"); 
    }
}

async function marcarEgresoEstado(id, nuevoEstado) { 
    try {
        const payload = { 
            id: id, 
            estado: nuevoEstado 
        };
        
        await fetch(`${API_URL}/egresos/estado`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
        
        renderizarTodasLasTablasAdmin(); 
    } catch(err) { 
        mostrarAlerta("Error al cambiar el estado del egreso.", "❌"); 
    }
}

async function eliminarEgreso(id) { 
    if(!confirm("¿Borrar definitivamente este egreso del comité? Esto no se puede deshacer.")) {
        return; 
    }
    
    try {
        await fetch(`${API_URL}/egresos/${id}`, { 
            method: 'DELETE' 
        }); 
        
        mostrarAlerta("Egreso eliminado permanentemente del sistema.", "✅");
        renderizarTodasLasTablasAdmin(); 
    } catch(err) { 
        mostrarAlerta("Error al eliminar el egreso.", "❌"); 
    }
}