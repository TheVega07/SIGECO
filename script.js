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
let cursoFiltroGastos = "TODOS";
let padreViendoGastosActual = null;

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
    if(!c1 || !c2) {
        return false;
    }
    return c1.toUpperCase().replace(/\s+/g, '') === c2.toUpperCase().replace(/\s+/g, '');
}

function abrirModalActividad() {
    document.getElementById('form-actividad').reset();
    limpiarFeedbackArchivos();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalActividad')).show();
}

function aplicarFiltroGastos(curso) {
    cursoFiltroGastos = curso;
    volverListaPadresGastos();
    renderizarTodasLasTablasAdmin();
}

function filtrarPadresGastos() {
    const input = document.getElementById('buscador-padres-gastos').value.toLowerCase();
    const filas = document.querySelectorAll('.fila-padre-gasto');

    filas.forEach(fila => {
        const nombre = fila.querySelector('.nombre-padre-gasto').innerText.toLowerCase();

        if (nombre.includes(input)) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}

function verDetalleGastosPadre(username, reRender = false) {
    padreViendoGastosActual = username;
    const u = usuariosBD.find(x => String(x.username) === String(username));

    if(!u) {
        return;
    }

    document.getElementById('vista-lista-padres-gastos').classList.add('oculto');
    document.getElementById('vista-detalle-padre-gastos').classList.remove('oculto');
    document.getElementById('titulo-detalle-gastos-padre').innerHTML = `<i class="bi bi-person-lines-fill me-2"></i>Deudas de: <span class="text-primary">${u.nombre}</span>`;

    const chkAll = document.getElementById('chk-all-gastos');
    if(chkAll) {
        chkAll.checked = false;
    }

    const tbody = document.getElementById('tabla-detalle-gastos');
    tbody.innerHTML = '';

    const deudas = gastosPadres.filter(g => String(g.username) === String(username));

    if (deudas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted py-4">Este padre no tiene deudas registradas.</td></tr>`;
    } else {
        deudas.forEach(g => {
            const btnSt = g.estado === 'PENDIENTE'
                ? `<button class="btn btn-sm btn-success fw-bold shadow-sm me-1" onclick="cambiarEstadoGastoAdmin(${g.id}, 'PAGADO')"><i class="bi bi-check2"></i> Pagar</button>`
                : `<button class="btn btn-sm btn-warning fw-bold shadow-sm me-1" onclick="cambiarEstadoGastoAdmin(${g.id}, 'PENDIENTE')"><i class="bi bi-arrow-counterclockwise"></i> Revertir</button>`;

            let claseInsignia = g.estado === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark';

            tbody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="form-check-input chk-gasto-item" value="${g.id}"></td>
                <td>${g.fecha}</td>
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

function volverListaPadresGastos() {
    padreViendoGastosActual = null;

    if(document.getElementById('vista-detalle-padre-gastos')) {
        document.getElementById('vista-detalle-padre-gastos').classList.add('oculto');
        document.getElementById('vista-lista-padres-gastos').classList.remove('oculto');
        document.getElementById('buscador-padres-gastos').value = '';
        filtrarPadresGastos();
    }
}

function toggleAllGastos(source) {
    const checkboxes = document.querySelectorAll('.chk-gasto-item');

    checkboxes.forEach(chk => {
        chk.checked = source.checked;
    });
}

async function cambiarEstadoSeleccionados(nuevoEstado) {
    const checkboxes = document.querySelectorAll('.chk-gasto-item:checked');
    const seleccionados = Array.from(checkboxes).map(chk => chk.value);

    if(seleccionados.length === 0) {
        mostrarAlerta("Debes seleccionar al menos un rubro marcando su casilla.", "⚠️");
        return;
    }

    if(!confirm(`¿Estás seguro de marcar las ${seleccionados.length} deuda(s) seleccionada(s) como ${nuevoEstado}?`)) {
        return;
    }

    const btnAccion = document.getElementById('btn-pagar-seleccionados');
    let originalText = "";

    if (btnAccion) {
        originalText = btnAccion.innerHTML;
        btnAccion.disabled = true;
        btnAccion.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Procesando...`;
    }

    let procesados = 0;

    for(let id of seleccionados) {
        try {
            let payload = {
                id: id,
                estado: nuevoEstado
            };

            let r = await fetch(`${API_URL}/gastos/estado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(r.ok) {
                procesados++;
            }
        } catch(e) {
            console.error("Error al cambiar estado", id);
        }
    }

    if (btnAccion) {
        btnAccion.disabled = false;
        btnAccion.innerHTML = originalText;
    }

    mostrarAlerta(`Se marcaron ${procesados} deudas como ${nuevoEstado} correctamente.`, "✅");
    renderizarTodasLasTablasAdmin();
}

async function eliminarGastosSeleccionados() {
    const checkboxes = document.querySelectorAll('.chk-gasto-item:checked');
    const seleccionados = Array.from(checkboxes).map(chk => chk.value);

    if(seleccionados.length === 0) {
        mostrarAlerta("Debes seleccionar al menos una deuda marcando su casilla.", "⚠️");
        return;
    }

    if(!confirm(`¿Estás seguro de borrar permanentemente las ${seleccionados.length} deuda(s)? Esta acción no se puede deshacer.`)) {
        return;
    }

    const btnDelete = document.getElementById('btn-borrar-seleccionados');
    const originalText = btnDelete.innerHTML;

    btnDelete.disabled = true;
    btnDelete.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Borrando...`;

    let borrados = 0;

    for(let id of seleccionados) {
        try {
            let r = await fetch(`${API_URL}/gastos/${id}`, { method: 'DELETE' });
            if(r.ok) {
                borrados++;
            }
        } catch(e) {
            console.error(e);
        }
    }

    btnDelete.disabled = false;
    btnDelete.innerHTML = originalText;

    mostrarAlerta(`Se eliminaron ${borrados} deudas correctamente.`, "✅");
    renderizarTodasLasTablasAdmin();
}

function abrirModalPagoMasivoRubro() {
    document.getElementById('form-pago-masivo-rubro').reset();

    const selCurso = document.getElementById('pmr-curso');
    const cursosBrutos = usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== '');
    const cursosUnicos = [...new Set(cursosBrutos)].sort();

    selCurso.innerHTML = '<option value="TODOS">🌐 A Todos los Paralelos (Colegio entero)</option>';

    cursosUnicos.forEach(c => {
        selCurso.innerHTML += `<option value="${c}">Solo a los de Paralelo ${c}</option>`;
    });

    const conceptosPendientes = [...new Set(gastosPadres.filter(g => g.estado === 'PENDIENTE').map(g => g.concepto))].sort();
    const divRubros = document.getElementById('pmr-lista-rubros');
    divRubros.innerHTML = '';

    if(conceptosPendientes.length === 0) {
        divRubros.innerHTML = '<div class="text-muted small py-2"><i class="bi bi-emoji-smile me-1"></i> No hay ningún rubro pendiente de cobro en este momento.</div>';
        document.getElementById('btn-pmr-submit').disabled = true;
    } else {
        document.getElementById('btn-pmr-submit').disabled = false;

        conceptosPendientes.forEach((c, idx) => {
            divRubros.innerHTML += `
            <div class="form-check border-bottom py-2">
                <input class="form-check-input chk-pmr-concepto ms-1" type="checkbox" value="${c}" id="chk-pmr-${idx}" style="transform: scale(1.2);">
                <label class="form-check-label text-dark fw-bold ms-2" for="chk-pmr-${idx}">${c}</label>
            </div>`;
        });
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPagoMasivoRubro')).show();
}

async function procesarPagoMasivoRubro(e) {
    e.preventDefault();
    const cursoSel = document.getElementById('pmr-curso').value;
    const checkboxes = document.querySelectorAll('.chk-pmr-concepto:checked');
    const conceptosSeleccionados = Array.from(checkboxes).map(c => c.value);

    if(conceptosSeleccionados.length === 0) {
        mostrarAlerta("Debes seleccionar al menos un rubro de la lista.", "⚠️");
        return;
    }

    let deudasAfectadas = gastosPadres.filter(g => g.estado === 'PENDIENTE' && conceptosSeleccionados.includes(g.concepto));

    if(cursoSel !== 'TODOS') {
        deudasAfectadas = deudasAfectadas.filter(g => {
            let u = usuariosBD.find(x => String(x.username) === String(g.username));
            return u && compararCursos(u.curso, cursoSel);
        });
    }

    if(deudasAfectadas.length === 0) {
        mostrarAlerta("No se encontraron padres que deban estos rubros en el paralelo seleccionado.", "⚠️");
        return;
    }

    if(!confirm(`Se encontraron ${deudasAfectadas.length} deudas pendientes de estos rubros. ¿Estás seguro de marcarlas todas como PAGADAS automáticamente?`)) {
        return;
    }

    const btn = document.getElementById('btn-pmr-submit');
    const originalHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Pagando a todos...`;

    let exitos = 0;

    for(let d of deudasAfectadas) {
        try {
            let payload = {
                id: d.id,
                estado: 'PAGADO'
            };

            let r = await fetch(`${API_URL}/gastos/estado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(r.ok) {
                exitos++;
            }
        } catch(error) {
            console.error(error);
        }
    }

    btn.disabled = false;
    btn.innerHTML = originalHtml;

    bootstrap.Modal.getInstance(document.getElementById('modalPagoMasivoRubro')).hide();
    mostrarAlerta(`¡Éxito! Se marcaron ${exitos} deudas como PAGADO en el sistema.`, "✅");
    renderizarTodasLasTablasAdmin();
}

function inyectarNuevasFunciones() {
    forzarNombreSIGECO28();

    const filePago = document.getElementById('pago-voucher-file');
    if(filePago) {
        filePago.setAttribute('accept', '.jpg, .jpeg');
        filePago.setAttribute('title', 'Solo imágenes JPG');
    }

    const formEgreso = document.getElementById('form-egreso');

    if (formEgreso && !document.getElementById('egreso-file')) {
        const btnSubmit = formEgreso.querySelector('button[type="submit"]');

        if (btnSubmit) {
            btnSubmit.insertAdjacentHTML('beforebegin', `
                <div class="mb-3">
                    <label class="fw-bold"><i class="bi bi-cloud-arrow-up-fill me-1"></i> Comprobante de Pago / Factura</label>
                    <input type="file" class="form-control" id="egreso-file" accept=".pdf, .jpg, .jpeg">
                    <div id="feedback-egreso-file" class="text-success small mt-1 oculto"></div>
                </div>
            `);

            document.getElementById('egreso-file').addEventListener('change', function(e) {
                const fb = document.getElementById('feedback-egreso-file');

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
    }

    const adminPortal = document.getElementById('portal-admin');

    if (adminPortal && !document.getElementById('admin-modulo-curso')) {
        const moduloCursoHTML = `
        <div id="admin-modulo-curso" class="oculto mb-4">
            <div class="card shadow-sm mb-4 border-primary" id="filtro-curso-global">
                <div class="card-body p-3 bg-light rounded">
                    <div class="d-flex flex-column flex-md-row align-items-md-center">
                        <label class="fw-bold text-primary mb-2 mb-md-0 me-md-3 text-nowrap">
                            <i class="bi bi-funnel-fill me-2"></i>Filtrar vistas por Curso/Paralelo:
                        </label>
                        <select class="form-select border-primary shadow-sm w-100" id="select-filtro-curso" onchange="aplicarFiltroCurso(this.value)">
                            <option value="TODOS">Todos los Cursos (General)</option>
                        </select>
                    </div>
                </div>
            </div>

            <h4 class="text-primary fw-bold mb-3"><i class="bi bi-bar-chart-fill me-2"></i>Recaudación por Curso</h4>
            <div class="table-responsive bg-white rounded shadow border p-3 mb-4">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-primary">
                        <tr>
                            <th>Curso / Paralelo</th>
                            <th>Total Alumnos</th>
                            <th>Total Recaudado</th>
                            <th>Meta a Recaudar</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-dashboard-curso"></tbody>
                </table>
            </div>

            <h4 class="text-primary fw-bold mb-3"><i class="bi bi-graph-up-arrow me-2"></i>Avance por Paralelo</h4>
            <div id="contenedor-barras-curso" class="bg-white rounded shadow border p-3">
                <!-- Se llena dinámicamente en renderizarDashboardCurso -->
            </div>
        </div>`;
        adminPortal.insertAdjacentHTML('beforeend', moduloCursoHTML);
    } else if (adminPortal && document.getElementById('admin-modulo-curso') && !document.getElementById('contenedor-barras-curso')) {
        document.getElementById('admin-modulo-curso').insertAdjacentHTML('beforeend', `
            <h4 class="text-primary fw-bold mb-3 mt-4"><i class="bi bi-graph-up-arrow me-2"></i>Avance por Paralelo</h4>
            <div id="contenedor-barras-curso" class="bg-white rounded shadow border p-3"></div>
        `);
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
                        <h5 class="modal-title"><i class="bi bi-bag-plus-fill me-2"></i>Asignar Gasto Manual (1x1)</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-asignar-gasto">
                            <div class="mb-3">
                                <label class="fw-bold">Seleccionar Padre:</label>
                                <select class="form-select" id="gasto-asignar-usuario" required>
                                    <!-- Se llena automáticamente -->
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold">Concepto (Ej. Anuario, Chompa)</label>
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
                            <button type="submit" class="btn btn-danger w-100 fw-bold">Guardar Gasto Simple</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalGastosHTML);
        document.getElementById('form-asignar-gasto').addEventListener('submit', guardarNuevoGastoAdmin);
    }

    if (!document.getElementById('modalCargaMasivaGastos')) {
        const modalMasivaHTML = `
        <div class="modal fade" id="modalCargaMasivaGastos" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-white">
                        <h5 class="modal-title"><i class="bi bi-file-earmark-spreadsheet-fill me-2"></i>Carga Masiva desde Excel</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="form-carga-masiva">
                            <div class="alert alert-info small">
                                <strong>Instrucciones:</strong> Copia en tu Excel las celdas de Concepto y Valor y pégalas abajo. El sistema ignorará las columnas vacías automáticamente.
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="fw-bold">Seleccionar Padre(s):</label>
                                    <select class="form-select" id="carga-masiva-usuario" required>
                                        <!-- Se llena en abrirModalCargaMasiva() -->
                                    </select>
                                </div>
                                <div class="col-md-6 mt-2 mt-md-0">
                                    <label class="fw-bold">Fecha de Asignación:</label>
                                    <input type="date" class="form-control" id="carga-masiva-fecha" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="fw-bold"><i class="bi bi-clipboard-data me-1"></i>Pega aquí las celdas copiadas de Excel:</label>
                                <textarea class="form-control" id="carga-masiva-texto" rows="8" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-dark w-100 fw-bold fs-5" id="btn-carga-masiva">Subir Rubros Masivamente</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalMasivaHTML);
        document.getElementById('form-carga-masiva').addEventListener('submit', procesarCargaMasiva);
    }

    if (!document.getElementById('modalPagoMasivoRubro')) {
        const modalPMRHTML = `
        <div class="modal fade" id="modalPagoMasivoRubro" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title"><i class="bi bi-check2-all me-2"></i>Marcar Rubros como PAGADOS a Todos</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info small">
                            <strong>¿Cómo funciona?</strong> Selecciona uno o varios rubros de abajo. El sistema buscará a <b>todos los padres</b> que lo deban y se los marcará como <b>PAGADO</b> instantáneamente.
                        </div>
                        <form id="form-pago-masivo-rubro">
                            <div class="mb-3">
                                <label class="fw-bold">Aplicar a:</label>
                                <select class="form-select border-success" id="pmr-curso"></select>
                            </div>
                            <div class="mb-4">
                                <label class="fw-bold mb-2">Selecciona los Rubros que ya pagaron:</label>
                                <div id="pmr-lista-rubros" class="border border-success rounded p-2 shadow-sm bg-light" style="max-height: 220px; overflow-y: auto;">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-success w-100 fw-bold fs-5 shadow-sm" id="btn-pmr-submit">
                                <i class="bi bi-lightning-charge-fill me-1"></i> Ejecutar Pago Masivo
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalPMRHTML);
        document.getElementById('form-pago-masivo-rubro').addEventListener('submit', procesarPagoMasivoRubro);
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
                                - Niños: $${PRECIO_NINO.toFixed(2)} c/u
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

    if (adminPortal && !document.getElementById('admin-modulo-actividades')) {
        const moduloActividadesHTML = `
        <div id="admin-modulo-actividades" class="oculto mb-4">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 border-bottom pb-2">
                <h4 class="text-primary fw-bold mb-3 mb-md-0"><i class="bi bi-cash-coin me-2"></i>Ingresos por Actividades Extra</h4>
                <button class="btn btn-success shadow-sm fw-bold" onclick="abrirModalActividad()">
                    <i class="bi bi-plus-circle me-1"></i> Registrar Ingreso
                </button>
            </div>
            <div class="table-responsive bg-white rounded shadow border p-3">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-success">
                        <tr>
                            <th>Fecha</th>
                            <th>Paralelo</th>
                            <th>Descripción</th>
                            <th>Valor Recaudado</th>
                            <th>Respaldo</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-actividades"></tbody>
                </table>
            </div>
        </div>`;

        adminPortal.insertAdjacentHTML('beforeend', moduloActividadesHTML);
    }

    if (adminPortal && !document.getElementById('admin-modulo-gastospadres')) {
        const moduloGastosHTML = `
        <div id="admin-modulo-gastospadres" class="oculto mb-4">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 border-bottom pb-2">
                <h4 class="text-danger fw-bold mb-3 mb-md-0"><i class="bi bi-bag-x-fill me-2"></i>Deudas por Rubros (Padres)</h4>

                <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-danger shadow-sm fw-bold" onclick="abrirModalGastoAdmin()">
                        <i class="bi bi-plus-circle me-1"></i> Asignar 1x1
                    </button>
                    <button class="btn btn-dark shadow-sm fw-bold" onclick="abrirModalCargaMasiva()">
                        <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Carga Masiva (Excel)
                    </button>
                    <button class="btn btn-success shadow-sm fw-bold" onclick="abrirModalPagoMasivoRubro()">
                        <i class="bi bi-check2-all me-1"></i> Pagar a Todos
                    </button>
                </div>
            </div>

            <div id="vista-lista-padres-gastos">
                <div class="row mb-3">
                    <div class="col-md-6 mb-2 mb-md-0">
                        <div class="input-group shadow-sm">
                            <span class="input-group-text bg-white border-danger text-danger"><i class="bi bi-search"></i></span>
                            <input type="text" id="buscador-padres-gastos" class="form-control border-danger" placeholder="Buscar padre por nombre..." onkeyup="filtrarPadresGastos()">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <select id="filtro-local-gastos" class="form-select border-danger fw-bold shadow-sm" onchange="aplicarFiltroGastos(this.value)">
                            <option value="TODOS">Todos los Paralelos</option>
                        </select>
                    </div>
                </div>
                <div class="table-responsive bg-white rounded shadow border p-3">
                    <table class="table table-hover align-middle text-center">
                        <thead class="table-danger">
                            <tr>
                                <th>Padre de Familia</th>
                                <th>Paralelo</th>
                                <th>Total Deuda Rubros</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-padres-gastos"></tbody>
                    </table>
                </div>
            </div>

            <div id="vista-detalle-padre-gastos" class="oculto">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 p-3 bg-light rounded border">
                    <h5 class="fw-bold text-dark mb-3 mb-md-0" id="titulo-detalle-gastos-padre"></h5>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-success fw-bold shadow-sm" id="btn-pagar-seleccionados" onclick="cambiarEstadoSeleccionados('PAGADO')">
                            <i class="bi bi-check-circle-fill me-1"></i>Pagar Seleccionados
                        </button>
                        <button class="btn btn-sm btn-danger fw-bold shadow-sm" id="btn-borrar-seleccionados" onclick="eliminarGastosSeleccionados()">
                            <i class="bi bi-trash-fill me-1"></i>Borrar Seleccionados
                        </button>
                        <button class="btn btn-sm btn-secondary fw-bold shadow-sm" onclick="volverListaPadresGastos()">
                            <i class="bi bi-arrow-left-circle-fill me-1"></i>Volver a la lista
                        </button>
                    </div>
                </div>
                <div class="table-responsive bg-white rounded shadow border p-3">
                    <table class="table table-hover align-middle text-center">
                        <thead class="table-danger">
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" class="form-check-input" id="chk-all-gastos" onchange="toggleAllGastos(this)" title="Seleccionar Todo">
                                </th>
                                <th>Fecha</th>
                                <th>Concepto (Deuda)</th>
                                <th>Valor</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tabla-detalle-gastos"></tbody>
                    </table>
                </div>
            </div>
        </div>`;

        adminPortal.insertAdjacentHTML('afterbegin', moduloGastosHTML);
    }
}

function abrirModalCargaMasiva() {
    document.getElementById('form-carga-masiva').reset();

    document.getElementById('carga-masiva-fecha').value = new Date().toISOString().split('T')[0];

    const sel = document.getElementById('carga-masiva-usuario');
    sel.innerHTML = `
        <option value="">-- Seleccione a quién asignar la lista --</option>
        <option value="TODOS" class="fw-bold text-danger">⚠️ A TODOS LOS PADRES DEL COLEGIO</option>
    `;

    let padres = usuariosBD.filter(u => u.rol === 'PADRE');
    padres.sort((a, b) => a.nombre.localeCompare(b.nombre));

    padres.forEach(u => {
        sel.innerHTML += `<option value="${u.username}">${u.nombre} (Paralelo ${u.curso||'Sin curso'})</option>`;
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCargaMasivaGastos')).show();
}

async function procesarCargaMasiva(e) {
    e.preventDefault();
    const usuarioSel = document.getElementById('carga-masiva-usuario').value;
    const texto = document.getElementById('carga-masiva-texto').value;
    const fecha = document.getElementById('carga-masiva-fecha').value;

    const lineas = texto.split('\n');
    let rubrosValidos = [];

    for (let linea of lineas) {
        if (linea.trim() === '') {
            continue;
        }

        let celdas = linea.split('\t');
        let concepto = celdas[0] ? celdas[0].trim() : '';
        let valor = 0;

        for (let i = 1; i < celdas.length; i++) {
            let num = parseFloat(celdas[i].replace(',', '.').replace(/[^0-9.-]/g, ''));
            if (!isNaN(num) && num > 0) {
                valor = num;
                break;
            }
        }

        if (concepto !== '' && valor > 0) {
            rubrosValidos.push({ concepto, valor });
        }
    }

    if (rubrosValidos.length === 0) {
        mostrarAlerta("No se detectaron rubros válidos.", "⚠️");
        return;
    }

    if(!confirm(`Se detectaron ${rubrosValidos.length} rubros. ¿Proceder a subirlos?`)) {
        return;
    }

    const btn = document.getElementById('btn-carga-masiva');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Subiendo...`;

    let exitos = 0;

    for (let rubro of rubrosValidos) {
        try {
            let payload = {
                usuario: usuarioSel,
                concepto: rubro.concepto,
                fecha: fecha,
                valor: rubro.valor
            };

            let r = await fetch(`${API_URL}/gastos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(r.ok) {
                exitos++;
            }
        } catch(e) {
            console.error("Error al subir rubro masivo", e);
        }
    }

    btn.disabled = false;
    btn.innerHTML = `Subir Rubros Masivamente`;

    bootstrap.Modal.getInstance(document.getElementById('modalCargaMasivaGastos')).hide();
    mostrarAlerta(`Carga completada: Se guardaron ${exitos} rubros.`, "✅");

    renderizarTodasLasTablasAdmin();
}

async function iniciarSesion(e) {
    e.preventDefault();
    const btnSubmit = document.querySelector('#form-login button[type="submit"]');
    const txtOriginal = btnSubmit ? btnSubmit.innerHTML : 'Iniciar Sesión';

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Cargando datos...`;
    }

    let barra = document.getElementById('login-progress-bar');
    if(!barra) {
        barra = document.createElement('div');
        barra.id = 'login-progress-bar';
        barra.className = 'progress mt-3 shadow-sm';
        barra.style.height = '8px';
        barra.innerHTML = `<div class="progress-bar progress-bar-striped progress-bar-animated bg-success w-100"></div>`;
        document.getElementById('form-login').appendChild(barra);
    }
    barra.classList.remove('oculto');

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
        mostrarAlerta("Error de conexión.", "❌");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = txtOriginal;
        }
        if(barra) {
            barra.classList.add('oculto');
        }
    }
}

async function guardarClaveForzada(e) {
    e.preventDefault();
    try {
        const payload = {
            username: usuarioActual.username,
            password: document.getElementById('nueva-clave-forzada').value,
            forzar: 0
        };

        const resp = await fetch(`${API_URL}/usuarios/clave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if(resp.ok && data.exito){
            usuarioActual.debe_cambiar_clave = 0;
            sessionStorage.setItem('sesionSIGECO', JSON.stringify(usuarioActual));

            bootstrap.Modal.getInstance(document.getElementById('modalForzarClave')).hide();
            document.getElementById('form-forzar-clave').reset();

            mostrarAlerta('Contraseña actualizada.', '🔐');
            cargarPortalSegunRol(usuarioActual);
        } else {
            mostrarAlerta("Error al cambiar contraseña.", "❌");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión.", "❌");
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
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('gastospadres', this)"><i class="bi bi-bag-x-fill me-2"></i> Gastos a Padres</a></li>
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
        let menuHTMLPadre = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-2"></i> Estado de Cuenta</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('misgastos', this)"><i class="bi bi-bag-x-fill me-2"></i> Mis Gastos Asignados</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open-fill me-2"></i> Documentos</a></li>
        `;
        document.getElementById('menu-navegacion').innerHTML = menuHTMLPadre;

        const portalPadre = document.getElementById('portal-padre');

        // RESTRUCTURACIÓN COMPLETA DE LA TABLA MIS GASTOS PARA TENER "VALOR ORIGINAL" Y "SALDO PENDIENTE"
        if (portalPadre && !document.getElementById('padre-vista-misgastos')) {
            const vistaGastosHTML = `
            <div id="padre-vista-misgastos" class="oculto">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 border-bottom pb-2">
                    <h4 class="fw-bold text-danger mb-3 mb-md-0"><i class="bi bi-bag-x-fill me-2"></i>Mis Gastos Asignados (Detalle)</h4>
                    <button class="btn btn-dark fw-bold shadow-sm" onclick="abrirModalFiestaPadre()">
                        <i class="bi bi-balloon-fill me-1"></i> Asistencia Fiesta
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
                                        <th>Valor Original</th>
                                        <th>Saldo Pendiente</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="tabla-misgastos-padre"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;
            portalPadre.insertAdjacentHTML('beforeend', vistaGastosHTML);
        }

        document.getElementById('portal-padre').classList.remove('oculto');
        document.getElementById('portal-admin').classList.add('oculto');

        cambiarVistaPadre('estado', document.querySelector('#menu-navegacion .nav-link'));
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

    const targetModule = document.getElementById(`admin-modulo-${modulo}`);
    if (targetModule) {
        targetModule.classList.remove('oculto');
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
    const selectGastos = document.getElementById('filtro-local-gastos');

    const cursosBrutos = usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== '');
    const cursosUnicos = [...new Set(cursosBrutos)].sort();

    if(selectFiltro) {
        const val = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="TODOS">Todos los Cursos (General)</option>';

        cursosUnicos.forEach(c => {
            selectFiltro.innerHTML += `<option value="${c}">Solo mostrar Paralelo ${c}</option>`;
        });

        if(cursosUnicos.includes(val)) {
            selectFiltro.value = val;
        }
    }

    if(selectGastos) {
        const val = selectGastos.value;
        selectGastos.innerHTML = '<option value="TODOS">Todos los Paralelos</option>';

        cursosUnicos.forEach(c => {
            selectGastos.innerHTML += `<option value="${c}">Paralelo ${c}</option>`;
        });

        if(cursosUnicos.includes(val)) {
            selectGastos.value = val;
        }
    }

    if(selectModal) {
        const valModal = selectModal.value;
        selectModal.innerHTML = `
            <option value="">-- Seleccione un Curso --</option>
            <option value="TODOS">🌐 Todos los Cursos (General)</option>
        `;

        cursosUnicos.forEach(c => {
            selectModal.innerHTML += `<option value="${c}">Paralelo ${c}</option>`;
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
        <option value="TODOS" class="fw-bold text-danger">⚠ A TODOS LOS PADRES (COBRO GENERAL)</option>
    `;

    let padres = usuariosBD.filter(u => u.rol === 'PADRE');
    padres.sort((a, b) => a.nombre.localeCompare(b.nombre));

    padres.forEach(u => {
        sel.innerHTML += `<option value="${u.username}">${u.nombre}</option>`;
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGastosPadreAdmin')).show();
}

async function guardarNuevoGastoAdmin(e) {
    e.preventDefault();
    try {
        const payload = {
            usuario: document.getElementById('gasto-asignar-usuario').value,
            concepto: document.getElementById('gasto-asignar-desc').value,
            fecha: document.getElementById('gasto-asignar-fecha').value,
            valor: parseFloat(document.getElementById('gasto-asignar-valor').value)
        };

        const resp = await fetch(`${API_URL}/gastos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalGastosPadreAdmin')).hide();
            mostrarAlerta("Gasto asignado exitosamente.", "✅");
            renderizarTodasLasTablasAdmin();
        } else {
            mostrarAlerta("Error al asignar el gasto", "❌");
        }
    } catch(err) {
        mostrarAlerta("Error de conexión", "❌");
    }
}

async function cambiarEstadoGastoAdmin(id, nuevoEstado) {
    try {
        const payload = {
            id: id,
            estado: nuevoEstado
        };

        await fetch(`${API_URL}/gastos/estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        renderizarTodasLasTablasAdmin();
    } catch (error) {
        mostrarAlerta("Error al cambiar estado", "❌");
    }
}

async function eliminarGastoAdmin(id) {
    if(!confirm("¿Borrar permanentemente?")) {
        return;
    }

    try {
        await fetch(`${API_URL}/gastos/${id}`, { method: 'DELETE' });
        mostrarAlerta("Deuda eliminada.", "✅");
        renderizarTodasLasTablasAdmin();
    } catch (error) {
        mostrarAlerta("Error al eliminar", "❌");
    }
}

async function renderizarTodasLasTablasAdmin() {
    await cargarDatosDesdeServidor();
    actualizarSelectCursos();

    let usuariosParaRender = usuariosBD;
    let pagosParaRender = pagosGlobales;
    let actividadesParaRender = actividadesGlobales;

    const selPagoAdmin = document.getElementById('pago-usuario');

    if (selPagoAdmin && usuarioActual && (usuarioActual.rol === 'ADMIN' || usuarioActual.rol === 'COMITE')) {
        const valAnterior = selPagoAdmin.value;
        selPagoAdmin.innerHTML = `<option value="">-- Seleccione un Padre --</option>`;

        let padresSelect = usuariosBD.filter(u => u.rol === 'PADRE');
        padresSelect.sort((a, b) => a.nombre.localeCompare(b.nombre));

        padresSelect.forEach(u => {
            selPagoAdmin.innerHTML += `<option value="${u.username}">${u.nombre} (Paralelo ${u.curso || 'Sin curso'})</option>`;
        });

        if(usuariosBD.some(p => p.username === valAnterior)) {
            selPagoAdmin.value = valAnterior;
        }
    }

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

    const tbPadresG = document.getElementById('tabla-padres-gastos');

    if (tbPadresG) {
        tbPadresG.innerHTML = '';
        let padresMostrar = usuariosBD.filter(u => u.rol === 'PADRE');

        if (cursoFiltroGastos !== "TODOS") {
            padresMostrar = padresMostrar.filter(u => compararCursos(u.curso, cursoFiltroGastos));
        }

        padresMostrar.sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (padresMostrar.length === 0) {
            tbPadresG.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay padres.</td></tr>`;
        } else {
            padresMostrar.forEach(u => {
                const deudasPadre = gastosPadres.filter(g => String(g.username) === String(u.username));
                const totalDeuda = deudasPadre.reduce((s, g) => s + parseFloat(g.valor || 0), 0);
                const deudasPendientes = deudasPadre.filter(g => g.estado === 'PENDIENTE').length;

                let badge = deudasPendientes > 0
                    ? `<span class="badge bg-warning text-dark ms-2">${deudasPendientes} Pendiente(s)</span>`
                    : `<span class="badge bg-success ms-2"><i class="bi bi-check-circle me-1"></i>Al día</span>`;

                tbPadresG.innerHTML += `
                <tr class="fila-padre-gasto">
                    <td class="fw-bold nombre-padre-gasto text-start"><i class="bi bi-person-fill me-2 text-secondary"></i>${u.nombre}</td>
                    <td><span class="badge bg-dark">${u.curso || 'Sin curso'}</span></td>
                    <td class="fw-bold text-danger fs-6">$${totalDeuda.toFixed(2)} ${badge}</td>
                    <td><button class="btn btn-sm btn-primary fw-bold" onclick="verDetalleGastosPadre('${u.username}')">Ver Deudas</button></td>
                </tr>`;
            });
        }

        if (padreViendoGastosActual) {
            verDetalleGastosPadre(padreViendoGastosActual, true);
        }
    }

    const tbU = document.getElementById('tabla-usuarios-admin');

    if(tbU) {
        tbU.innerHTML = '';
        usuariosParaRender.forEach(u => {
            let btnSt = u.estado === "ACTIVO"
                ? `<button class="btn btn-sm btn-outline-danger fw-bold shadow-sm" onclick="toggleEstadoUsuario('${u.username}')">Desactivar</button>`
                : `<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="toggleEstadoUsuario('${u.username}')">Activar</button>`;

            let claseEstado = u.estado === 'ACTIVO' ? 'bg-success' : 'bg-secondary';

            tbU.innerHTML += `
            <tr>
                <td class="text-primary fw-bold">${u.username}</td>
                <td>${u.nombre}</td>
                <td><span class="badge bg-primary">${u.rol}</span></td>
                <td><span class="badge bg-dark">${u.curso||'-'}</span></td>
                <td><span class="badge ${claseEstado}">${u.estado}</span></td>
                <td>
                    <div class="d-flex gap-1 justify-content-center">
                        <button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="abrirModalUsuario('${u.username}')">Editar</button>
                        ${btnSt}
                    </div>
                </td>
            </tr>`;
        });
    }

    const tp = document.getElementById('tabla-pagos');

    if(tp) {
        tp.innerHTML = '';
        if(pagosParaRender.length === 0) {
            tp.innerHTML = `<tr><td colspan="7" class="text-muted py-4">No hay pagos.</td></tr>`;
        } else {
            pagosParaRender.forEach(p => {
                const dU = usuariosBD.find(u => String(u.username) === String(p.usuario));

                const btnV = p.tiene_voucher
                    ? `<button class="btn btn-sm btn-info text-white ms-2" onclick="abrirVoucher(${p.id})">Voucher</button>`
                    : '';

                let btnA = p.estado === 'PENDIENTE'
                    ? `<button class="btn btn-sm btn-primary" onclick="validarPago(${p.id})">Aprobar</button>`
                    : '<i class="bi bi-check-circle-fill text-success fs-5"></i>';

                let claseEstado = p.estado === 'VALIDADO' ? 'bg-success' : 'bg-warning text-dark';

                tp.innerHTML += `
                <tr>
                    <td class="fw-bold text-start">${dU ? dU.nombre : p.usuario}<br><small class="text-muted">${dU ? dU.curso : ''}</small></td>
                    <td class="text-primary fw-bold">${p.usuario}</td>
                    <td>${p.fecha}</td>
                    <td>${p.voucher} ${btnV}</td>
                    <td class="fw-bold text-success">$${parseFloat(p.valor||0).toFixed(2)}</td>
                    <td><span class="badge ${claseEstado}">${p.estado}</span></td>
                    <td>${btnA}</td>
                </tr>`;
            });
        }
    }

    const te = document.getElementById('tabla-egresos');

    if(te) {
        te.innerHTML = '';
        if(egresosGlobales.length === 0) {
            te.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No hay egresos.</td></tr>`;
        } else {
            egresosGlobales.forEach(e => {
                const bD = e.tiene_doc
                    ? `<button class="btn btn-sm btn-outline-danger" onclick="verEgresoPDF(${e.id})">Factura</button>`
                    : '-';

                const est = e.estado_pago || 'PENDIENTE';

                const bE = est === 'PENDIENTE'
                    ? `<button class="btn btn-sm btn-success" onclick="marcarEgresoEstado(${e.id}, 'PAGADO')">Pagar</button>`
                    : `<button class="btn btn-sm btn-warning" onclick="marcarEgresoEstado(${e.id}, 'PENDIENTE')">Revertir</button>`;

                let claseEstado = est === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark';

                te.innerHTML += `
                <tr>
                    <td>${e.fecha}</td>
                    <td class="fw-bold text-dark">${e.descripcion}</td>
                    <td>${e.proveedor}</td>
                    <td class="fw-bold text-danger">-$${parseFloat(e.valor||0).toFixed(2)}</td>
                    <td><span class="badge ${claseEstado}">${est}</span></td>
                    <td>
                        <div class="d-flex gap-1 justify-content-center">
                            ${bD}
                            ${bE}
                            <button class="btn btn-sm btn-danger" onclick="eliminarEgreso(${e.id})"><i class="bi bi-trash-fill"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
    }

    const tc = document.getElementById('tabla-cuotas');

    if(tc) {
        tc.innerHTML = '';
        usuariosParaRender.filter(u => u.rol === 'PADRE').forEach(u => {
            const mG = gastosPadres.filter(g => String(g.username) === String(u.username));
            const tG = mG.reduce((s, g) => s + parseFloat(g.valor||0), 0);

            const tD = tG;

            const sumPagosFisicos = pagosGlobales.filter(p => String(p.usuario) === String(u.username) && p.estado === 'VALIDADO').reduce((s, p) => s + parseFloat(p.valor||0), 0);
            const sumGastosPagados = mG.filter(g => g.estado === 'PAGADO').reduce((s, g) => s + parseFloat(g.valor||0), 0);

            const tP = Math.max(sumPagosFisicos, sumGastosPagados);
            const sP = tD - tP;

            tc.innerHTML += `
            <tr>
                <td class="text-primary fw-bold">${u.username}</td>
                <td>${u.nombre}</td>
                <td>
                    <div class="small text-muted">Rubros Asignados: $${tG.toFixed(2)}</div>
                    <div class="fw-bold border-top pt-1 mt-1">Total Deuda: $${tD.toFixed(2)}</div>
                </td>
                <td>
                    <div class="small text-success">Abonado: $${tP.toFixed(2)}</div>
                    <div class="fw-bold text-danger border-top pt-1 mt-1">Saldo: $${sP.toFixed(2)}</div>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" disabled>
                        <i class="bi bi-slash-circle"></i> N/A
                    </button>
                </td>
            </tr>`;
        });
    }

    const ta = document.getElementById('tabla-actas');

    if(ta) {
        ta.innerHTML = '';
        if(actasGlobales.length === 0) {
            ta.innerHTML = `<tr><td colspan="3" class="text-muted py-4">No hay actas.</td></tr>`;
        } else {
            actasGlobales.forEach(a => {
                const bDoc = a.tiene_doc ? `<button class="btn btn-sm btn-dark" onclick="verActaPDF(${a.id})">Abrir Acta</button>` : '-';

                ta.innerHTML += `
                <tr>
                    <td>${a.fecha}</td>
                    <td class="fw-bold">${a.descripcion}</td>
                    <td>${bDoc}</td>
                </tr>`;
            });
        }
    }

    const tact = document.getElementById('tabla-actividades');

    if(tact) {
        tact.innerHTML = '';
        if(actividadesParaRender.length === 0) {
            tact.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay actividades.</td></tr>`;
        } else {
            actividadesParaRender.forEach(a => {
                const bDoc = a.tiene_doc ? `<button class="btn btn-sm btn-outline-success" onclick="verActividadPDF(${a.id})">Ver Respaldo</button>` : '-';

                tact.innerHTML += `
                <tr>
                    <td>${a.fecha}</td>
                    <td><span class="badge bg-dark">${a.curso}</span></td>
                    <td class="fw-bold">${a.descripcion}</td>
                    <td class="fw-bold text-success">+$${parseFloat(a.valor||0).toFixed(2)}</td>
                    <td>${bDoc}</td>
                </tr>`;
            });
        }
    }

    const tbDocs = document.getElementById('tabla-contratos');

    if(tbDocs) {
        tbDocs.innerHTML = '';
        if (contratosGlobales.length === 0) {
            tbDocs.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay contratos.</td></tr>`;
        } else {
            contratosGlobales.forEach(c => {
                const cCh = c.visible ? 'checked' : '';

                tbDocs.innerHTML += `
                <tr>
                    <td>${c.fecha}</td>
                    <td class="fw-bold">${c.desc||c.descripcion||''}</td>
                    <td>${c.prov||c.proveedor||''}</td>
                    <td class="fw-bold text-success">$${parseFloat(c.valor||0).toFixed(2)}</td>
                    <td>
                        <input class="form-check-input" type="checkbox" ${cCh} onchange="toggleVisibleDoc(${c.id}, this.checked)">
                    </td>
                </tr>`;
            });
        }
    }

    setTimeout(hacerTablasResponsivas, 200);
}

function renderizarDashboardAdmin(pagosRender, actiRender) {
    let pagosValidados = 0;

    let uMeta = (cursoFiltroActual === "TODOS")
        ? usuariosBD.filter(u => u.rol === 'PADRE')
        : usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, cursoFiltroActual));

    let metaTotal = 0;

    uMeta.forEach(u => {
        let deudasPadre = gastosPadres.filter(g => String(g.username) === String(u.username)).reduce((s, g) => s + parseFloat(g.valor||0), 0);
        metaTotal += deudasPadre;

        let uPagos = pagosRender.filter(p => String(p.usuario) === String(u.username) && p.estado === 'VALIDADO').reduce((s, p) => s + parseFloat(p.valor || 0), 0);
        let uGastosPagados = gastosPadres.filter(g => String(g.username) === String(u.username) && g.estado === 'PAGADO').reduce((s, g) => s + parseFloat(g.valor || 0), 0);

        pagosValidados += Math.max(uPagos, uGastosPagados);
    });

    let totalIngresosBase = cursoFiltroActual === "TODOS" ? ingresosGlobales.reduce((s, i) => s + parseFloat(i.valor || 0), 0) : 0;
    let totalIngresos = totalIngresosBase + pagosValidados + actiRender.reduce((s, a) => s + parseFloat(a.valor || 0), 0);

    let totalEgresos = (cursoFiltroActual === "TODOS") ? egresosGlobales.reduce((s, e) => s + parseFloat(e.valor || 0), 0) : 0;

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
    const contenedorBarras = document.getElementById('contenedor-barras-curso');

    if(!tc || !contenedorBarras) {
        return;
    }

    let cursosUnicos = [...new Set(usuariosBD.map(u => u.curso).filter(c => c && c.trim() !== ''))].sort();

    if(cursoFiltroActual !== "TODOS") {
        cursosUnicos = cursosUnicos.filter(c => compararCursos(c, cursoFiltroActual));
    }

    tc.innerHTML = '';
    contenedorBarras.innerHTML = '';

    if(cursosUnicos.length === 0) {
        tc.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay datos.</td></tr>`;
        contenedorBarras.innerHTML = '<div class="text-muted text-center py-3">No hay barras de progreso para mostrar.</div>';
        return;
    }

    cursosUnicos.forEach(curso => {
        const alumnos = usuariosBD.filter(u => u.rol === 'PADRE' && compararCursos(u.curso, curso));
        let mC = 0;
        let pV = 0;

        alumnos.forEach(a => {
            let deudaPadre = gastosPadres.filter(g => String(g.username) === String(a.username)).reduce((s, g) => s + parseFloat(g.valor||0), 0);
            mC += deudaPadre;

            let uPagos = pagosGlobales.filter(p => p.estado === 'VALIDADO' && String(p.usuario) === String(a.username)).reduce((s, p) => s + parseFloat(p.valor||0), 0);
            let uGastosPagados = gastosPadres.filter(g => String(g.username) === String(a.username) && g.estado === 'PAGADO').reduce((s, g) => s + parseFloat(g.valor||0), 0);

            pV += Math.max(uPagos, uGastosPagados);
        });

        let aV = actividadesGlobales.filter(a => compararCursos(a.curso, curso)).reduce((s, a) => s + parseFloat(a.valor||0), 0);
        const tR = pV + aV; 

        tc.innerHTML += `
        <tr>
            <td class="fw-bold" style="color:#1e3c72;">Paralelo ${curso}</td>
            <td class="fw-bold">${alumnos.length}</td>
            <td class="fw-bold text-success">$${tR.toFixed(2)}</td>
            <td class="fw-bold text-info">$${mC.toFixed(2)}</td>
        </tr>`;

        let porcentaje = mC > 0 ? (tR / mC) * 100 : 0;
        if(porcentaje > 100) porcentaje = 100;

        let colorBarra = 'bg-danger';
        if(porcentaje >= 50 && porcentaje < 80) colorBarra = 'bg-warning';
        if(porcentaje >= 80) colorBarra = 'bg-success';

        contenedorBarras.innerHTML += `
        <div class="mb-3">
            <div class="d-flex justify-content-between mb-1">
                <span class="fw-bold text-dark small">Paralelo ${curso}</span>
                <span class="text-muted small">$${tR.toFixed(2)} / $${mC.toFixed(2)}</span>
            </div>
            <div class="progress shadow-sm" style="height: 20px;">
                <div class="progress-bar ${colorBarra} fw-bold" role="progressbar" style="width: ${porcentaje.toFixed(2)}%;" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">${porcentaje.toFixed(0)}%</div>
            </div>
        </div>`;
    });
}

function abrirModalPagoPrellenado(valorPredeterminado = null) {
    document.getElementById('form-pago').reset();
    limpiarFeedbackArchivos();

    const sel = document.getElementById('pago-usuario');

    if (usuarioActual && usuarioActual.rol === 'PADRE') {
        sel.innerHTML = `<option value="${usuarioActual.username}">${usuarioActual.nombre}</option>`;
        sel.value = usuarioActual.username;
        sel.style.pointerEvents = "none";
        sel.style.backgroundColor = "#e9ecef";
    } else {
        sel.style.pointerEvents = "auto";
        sel.style.backgroundColor = "";
    }

    if(valorPredeterminado) {
        document.getElementById('pago-valor').value = parseFloat(valorPredeterminado).toFixed(2);
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPago')).show();
}

function abrirModalFiestaPadre() {
    const user = usuariosBD.find(u => String(u.username) === String(usuarioActual.username));
    document.getElementById('padre-adultos').value = user.adultos_fiesta || 0;
    document.getElementById('padre-ninos').value = user.ninos_fiesta || 0;

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFiestaPadre')).show();
}

async function guardarFiestaPadre(e) {
    e.preventDefault();
    try {
        const payload = {
            username: usuarioActual.username,
            adultos: document.getElementById('padre-adultos').value,
            ninos: document.getElementById('padre-ninos').value
        };

        const resp = await fetch(`${API_URL}/usuarios/fiesta/padre`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if(resp.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalFiestaPadre')).hide();
            mostrarAlerta("Asistencia guardada.", "✅");
            actualizarDashboardPadre();
        }
    } catch(err) {
        mostrarAlerta("Error al guardar asistencia.", "❌");
    }
}

function actualizarDashboardPadre() {
    cargarDatosDesdeServidor().then(() => {
        let user = usuariosBD.find(u => String(u.username) === String(usuarioActual.username));

        if(!user) {
            user = usuarioActual;
        }

        const mP = pagosGlobales.filter(p => String(p.usuario) === String(usuarioActual.username));
        const mG = gastosPadres.filter(g => String(g.username) === String(usuarioActual.username));

        let tR = mG.reduce((s, g) => s + parseFloat(g.valor||0), 0);
        let tA = tR;

        let sumPagosValidados = mP.filter(p => p.estado === 'VALIDADO').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
        let sumGastosMarcadosPagados = mG.filter(g => g.estado === 'PAGADO').reduce((sum, g) => sum + parseFloat(g.valor || 0), 0);

        let tP = Math.max(sumPagosValidados, sumGastosMarcadosPagados);
        let pen = tA - tP;

        const vMG = document.getElementById('tabla-misgastos-padre');

        // AQUI ESTÁ LA SOLUCIÓN DEFINITIVA A LA TABLA DE MIS GASTOS (SE AGREGARON LAS COLUMNAS VALOR ORIGINAL Y SALDO)
        if(vMG) {
            vMG.innerHTML = '';

            if (mG.length === 0) {
                vMG.innerHTML = `<tr><td colspan="6" class="text-muted py-4">No tiene rubros asignados.</td></tr>`;
            } else {
                let abonoDisponible = tP;

                mG.forEach(g => {
                    let valorRubro = parseFloat(g.valor || 0);
                    let saldoRubro = valorRubro;

                    // Lógica para que los abonos libres cubran de a pocos los rubros más antiguos
                    if (abonoDisponible > 0) {
                        if (abonoDisponible >= valorRubro) {
                            saldoRubro = 0;
                            abonoDisponible -= valorRubro;
                        } else {
                            saldoRubro = valorRubro - abonoDisponible;
                            abonoDisponible = 0;
                        }
                    }

                    // Si el administrador manualmente lo puso como PAGADO, forzar el saldo a cero
                    if(g.estado === 'PAGADO') {
                        saldoRubro = 0;
                    }

                    const bE = saldoRubro === 0 ? '<span class="badge bg-success">PAGADO</span>' : (saldoRubro < valorRubro ? '<span class="badge bg-info text-dark">ABONO PARCIAL</span>' : '<span class="badge bg-warning text-dark">PENDIENTE</span>');
                    const bA = saldoRubro > 0 ? `<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="abrirModalPagoPrellenado(${saldoRubro})"><i class="bi bi-upload"></i> Subir Pago</button>` : `<i class="bi bi-check-circle-fill text-success fs-5"></i>`;

                    // Inyección HTML con las DOS columnas para no perder el costo original de vista
                    vMG.innerHTML += `
                    <tr>
                        <td>${g.fecha}</td>
                        <td class="fw-bold text-start">${g.concepto}</td>
                        <td class="text-dark fw-bold">$${valorRubro.toFixed(2)}</td>
                        <td class="fw-bold text-danger">$${saldoRubro.toFixed(2)}</td>
                        <td>${bE}</td>
                        <td>${bA}</td>
                    </tr>`;
                });
            }
        }

        const vE = document.getElementById('padre-vista-estado');

        if (vE) {
            let tr = [];

            mG.forEach(g => {
                tr.push({
                    fecha: g.fecha,
                    c: `Gasto Asignado: ${g.concepto}`,
                    i: 0,
                    g: parseFloat(g.valor||0),
                    v: true
                });
            });

            mP.forEach(p => {
                tr.push({
                    fecha: p.fecha,
                    cmp: p.voucher || '-',
                    c: 'Abono / Transferencia Registrada',
                    i: parseFloat(p.valor || 0),
                    g: 0,
                    v: p.estado === 'VALIDADO'
                });
            });

            let ajusteAdmin = sumGastosMarcadosPagados > sumPagosValidados ? (sumGastosMarcadosPagados - sumPagosValidados) : 0;
            if (ajusteAdmin > 0) {
                let fechaAjuste = new Date().toISOString().split('T')[0];
                tr.push({
                    fecha: fechaAjuste,
                    cmp: 'SISTEMA',
                    c: 'Abono Directo en Administración (Aprobado Manual)',
                    i: ajusteAdmin,
                    g: 0,
                    v: true
                });
            }

            tr.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            tr.reverse();

            let hF = '';

            let trParaCalculo = [...tr].reverse();
            let saldosCalculados = [];
            let dA = 0; 

            trParaCalculo.forEach(t => {
                if(t.v) {
                    dA += t.g; 
                    dA -= t.i; 
                }
                saldosCalculados.push(dA);
            });

            saldosCalculados.reverse();

            if (tr.length === 0) {
                hF = `<tr><td colspan="6" class="text-muted py-4">No hay movimientos registrados.</td></tr>`;
            } else {
                tr.forEach((t, index) => {
                    let eE = t.v ? '' : '<br><span class="badge bg-warning text-dark mt-1"><i class="bi bi-hourglass-split me-1"></i>En Espera de Aprobación</span>';

                    let vI = t.i > 0 ? '$' + t.i.toFixed(2) : '-';
                    let vG = t.g > 0 ? '$' + t.g.toFixed(2) : '-';

                    let saldoLinea = saldosCalculados[index];
                    let vS = '$' + Math.max(0, saldoLinea).toFixed(2);

                    let colorS = t.v ? 'text-primary' : 'text-muted';

                    hF += `
                    <tr>
                        <td>${t.fecha}</td>
                        <td>${t.cmp||'-'}</td>
                        <td class="fw-bold text-start">${t.c} ${eE}</td>
                        <td class="text-success fw-bold">${vI}</td>
                        <td class="text-danger fw-bold">${vG}</td>
                        <td class="fw-bold ${colorS}">${vS}</td>
                    </tr>`;
                });
            }

            vE.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-primary shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-wallet2 me-2"></i>Total Gastos Asignados</h6>
                                <h3 class="fw-bold mb-0">$${tA.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-success shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-piggy-bank-fill me-2"></i>Total Abonado (Reconocido)</h6>
                                <h3 class="fw-bold mb-0">$${tP.toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <div class="card text-white bg-danger shadow-sm h-100">
                            <div class="card-body">
                                <h6 class="card-title"><i class="bi bi-exclamation-triangle-fill me-2"></i>Saldo Pendiente (Deuda)</h6>
                                <h3 class="fw-bold mb-0">$${Math.max(0, pen).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 border-bottom pb-2">
                    <h4 class="fw-bold text-primary mb-3 mb-md-0"><i class="bi bi-clock-history me-2"></i>Estado de Cuenta</h4>
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
                                        <th>Comprobante</th>
                                        <th>Concepto</th>
                                        <th>Ingreso</th>
                                        <th>Gasto</th>
                                        <th>Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${hF}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        setTimeout(hacerTablasResponsivas, 200);
    });
}

async function descargarArchivoInmune(url, nD) {
    try {
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.exito && data.base64) {
            let b64 = data.base64;

            if (!b64.includes('base64,')) {
                if (b64.startsWith('JVBER')) {
                    b64 = 'data:application/pdf;base64,' + b64;
                } else if (b64.startsWith('/9j/') || b64.startsWith('iVBOR')) {
                    b64 = 'data:image/jpeg;base64,' + b64;
                } else {
                    b64 = 'data:application/pdf;base64,' + b64;
                }
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
            a.download = nD;
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

        r.onload = () => {
            res(r.result);
        };

        r.onerror = (e) => {
            rej(e);
        };

        r.readAsDataURL(file);
    });
}

async function registrarPago(e) {
    e.preventDefault();
    let vB64 = "";
    const fI = document.getElementById('pago-voucher-file');

    if(fI && fI.files[0]) {
        if(!fI.files[0].type.match('image/jpeg')) {
            mostrarAlerta("Solo formato JPG o JPEG está permitido para comprobantes.", "⚠️");
            return;
        }

        try {
            vB64 = await leerArchivoComoBase64(fI.files[0]);
        } catch (e) {
            return;
        }
    }

    try {
        const payload = {
            usuario: document.getElementById('pago-usuario').value,
            fecha: document.getElementById('pago-fecha').value,
            voucher: document.getElementById('pago-voucher').value,
            valor: parseFloat(document.getElementById('pago-valor').value),
            voucher_b64: vB64
        };

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

            if(usuarioActual.rol === 'PADRE') {
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
    const fI = document.getElementById('act-file');
    const f = fI ? fI.files[0] : null;

    if(!f) {
        mostrarAlerta("Debes adjuntar el archivo PDF de respaldo obligatoriamente.", "⚠️");
        return;
    }

    let b64 = "";
    try {
        b64 = await leerArchivoComoBase64(f);
    } catch(err) {
        return;
    }

    try {
        const payload = {
            curso: document.getElementById('act-curso').value.trim(),
            descripcion: document.getElementById('act-desc').value.trim(),
            fecha: document.getElementById('act-fecha').value,
            valor: parseFloat(document.getElementById('act-valor').value),
            archivoNombre: f.name,
            archivoData: b64
        };

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
    } catch(e) {
        mostrarAlerta("Error de conexión.", "❌");
    }
}

async function registrarEgreso(e) {
    e.preventDefault();
    const fI = document.getElementById('egreso-file');
    const f = fI ? fI.files[0] : null;

    let b64 = "";
    let fN = "";

    if(f) {
        try {
            b64 = await leerArchivoComoBase64(f);
            fN = f.name;
        } catch(err) {
            return;
        }
    }

    try {
        const payload = {
            fecha: document.getElementById('egreso-fecha').value,
            descripcion: document.getElementById('egreso-desc').value,
            proveedor: document.getElementById('egreso-prov').value,
            valor: parseFloat(document.getElementById('egreso-valor').value),
            archivoNombre: fN,
            archivoData: b64
        };

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
    } catch(e) {
        mostrarAlerta("Error de conexión al registrar egreso.", "❌");
    }
}

async function subirActa(e) {
    e.preventDefault();
    const fI = document.getElementById('acta-file');
    const f = fI ? fI.files[0] : null;

    if(!f) {
        mostrarAlerta("Por favor, selecciona un documento PDF obligatoriamente.", "⚠️");
        return;
    }

    let b64 = "";
    try {
        b64 = await leerArchivoComoBase64(f);
    } catch(err) {
        return;
    }

    try {
        const payload = {
            fecha: document.getElementById('acta-fecha').value,
            descripcion: document.getElementById('acta-desc').value,
            archivoNombre: f.name,
            archivoData: b64
        };

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
    } catch(e) {
        mostrarAlerta("Error de conexión.", "❌");
    }
}

function abrirModalUsuario(username = null) {
    const f = document.getElementById('form-usuario');

    if(username) {
        const u = usuariosBD.find(x => String(x.username) === String(username));
        document.getElementById('usu-modo').value = "EDITAR";
        document.getElementById('usu-id').value = u.username;
        document.getElementById('usu-id').readOnly = true;

        document.getElementById('usu-nombre').value = u.nombre;
        document.getElementById('usu-rol').value = u.rol;
        document.getElementById('usu-curso').value = u.curso;

        document.getElementById('div-usu-clave').classList.add('oculto');
        document.getElementById('usu-clave').required = false;
    } else {
        f.reset();
        document.getElementById('usu-modo').value = "CREAR";
        document.getElementById('usu-id').readOnly = false;

        document.getElementById('div-usu-clave').classList.remove('oculto');
        document.getElementById('usu-clave').required = true;
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario')).show();
}

async function guardarUsuario(e) {
    e.preventDefault();
    try {
        const isC = document.getElementById('usu-modo').value === "CREAR";
        const method = isC ? 'POST' : 'PUT';

        const payload = {
            username: document.getElementById('usu-id').value.trim(),
            nombre: document.getElementById('usu-nombre').value,
            rol: document.getElementById('usu-rol').value,
            curso: document.getElementById('usu-curso').value,
            password: document.getElementById('usu-clave').value,
            asiste_fiesta: 'NO',
            adultos_fiesta: 0,
            ninos_fiesta: 0
        };

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
    } catch(e) {
        mostrarAlerta("Error de conexión al guardar usuario.", "❌");
    }
}

async function toggleEstadoUsuario(usr) {
    try {
        const u = usuariosBD.find(x => String(x.username) === String(usr));
        const nuevoEstado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";

        const payload = {
            username: usr,
            estado: nuevoEstado
        };

        await fetch(`${API_URL}/usuarios/estado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        renderizarTodasLasTablasAdmin();
    } catch(e) {
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
    try {
        const payload = {
            username: document.getElementById('cuota-usu').value,
            valor: parseFloat(document.getElementById('nueva-cuota-input').value)
        };

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
    const fI = document.getElementById('ctr-file');
    const f = fI ? fI.files[0] : null;

    if(!f) {
        mostrarAlerta("Por favor, selecciona un documento obligatoriamente.", "⚠️");
        return;
    }

    let b64 = "";
    try {
        b64 = await leerArchivoComoBase64(f);
    } catch(err) {
        return;
    }

    try {
        const payload = {
            tipo: tipo,
            fecha: document.getElementById('ctr-fecha').value,
            desc: document.getElementById('ctr-desc').value,
            prov: document.getElementById('ctr-prov').value,
            valor: parseFloat(document.getElementById('ctr-valor').value),
            archivoNombre: f.name,
            archivoData: b64,
            visible: document.getElementById('ctr-visible').checked ? 1 : 0
        };

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
    } catch(e) {
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

async function marcarEgresoEstado(id, est) {
    try {
        const payload = {
            id: id,
            estado: est
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