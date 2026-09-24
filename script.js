let usuariosBD = [], pagosGlobales = [], ingresosGlobales = [], egresosGlobales = [];
let contratosGlobales = [], actasGlobales = [], cotizacionesGlobales = [];
let usuarioActual = null;

const API_URL = "/api"; 

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('vista-login').classList.remove('oculto');

    document.getElementById('form-login').addEventListener('submit', iniciarSesion);
    document.getElementById('form-forzar-clave').addEventListener('submit', guardarClaveForzada);
    
    if (document.getElementById('form-usuario')) document.getElementById('form-usuario').addEventListener('submit', guardarUsuario);
    if (document.getElementById('form-pago')) document.getElementById('form-pago').addEventListener('submit', registrarPago);
    if (document.getElementById('form-cuota')) document.getElementById('form-cuota').addEventListener('submit', guardarNuevaCuota);
    if (document.getElementById('form-contrato')) document.getElementById('form-contrato').addEventListener('submit', (e) => subirDocumento(e, 'CONTRATO'));
    
    if (document.getElementById('form-egreso')) document.getElementById('form-egreso').addEventListener('submit', registrarEgreso);
    if (document.getElementById('form-acta')) document.getElementById('form-acta').addEventListener('submit', subirActa);
});

function mostrarAlerta(mensaje, icono = '✅') {
    document.getElementById('alerta-icono').innerText = icono;
    document.getElementById('alerta-mensaje').innerText = mensaje;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAlertaSistema')).show();
}

async function cargarDatosDesdeServidor() {
    try {
        const resp = await fetch(`${API_URL}/datos`);
        if (!resp.ok) throw new Error("Error en servidor");
        const data = await resp.json();
        usuariosBD = data.usuarios || []; 
        pagosGlobales = data.pagos || [];
        ingresosGlobales = data.ingresos || []; 
        egresosGlobales = data.egresos || [];
        contratosGlobales = data.contratos || [];
        actasGlobales = data.actas || [];
    } catch (e) {
        console.error(e);
        mostrarAlerta("Error al cargar los datos desde la base de datos.", "❌");
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
            errDiv.classList.remove('oculto'); 
            errDiv.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${data.mensaje}`;
        }
    } catch (error) { 
        mostrarAlerta("Error de conexión. Verifica el servidor.", "❌"); 
    }
}

async function guardarClaveForzada(e) {
    e.preventDefault();
    const nuevaClave = document.getElementById('nueva-clave-forzada').value;
    await fetch(`${API_URL}/usuarios/clave`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuarioActual.username, password: nuevaClave, forzar: 0 })
    });
    usuarioActual.debe_cambiar_clave = 0;
    bootstrap.Modal.getInstance(document.getElementById('modalForzarClave')).hide();
    document.getElementById('form-forzar-clave').reset();
    mostrarAlerta('Contraseña actualizada con éxito.', '🔐');
    cargarPortalSegunRol(usuarioActual);
}

function cargarPortalSegunRol(usuario) {
    usuarioActual = usuario;
    document.getElementById('mensaje-error').classList.add('oculto');
    document.getElementById('vista-login').classList.add('oculto');
    document.getElementById('vista-app').style.display = '';
    document.getElementById('vista-app').classList.remove('oculto');
    
    document.getElementById('nav-nombre-usuario').innerText = usuario.nombre;
    document.getElementById('badge-rol').innerText = usuario.rol;

    if (usuario.rol === 'ADMIN' || usuario.rol === 'COMITE') {
        let menuHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarModuloAdmin('resumen', this)"><i class="bi bi-grid me-1"></i> Resumen General</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('curso', this)"><i class="bi bi-bar-chart me-1"></i> Resumen por Curso</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('pagos', this)"><i class="bi bi-journal-check me-1"></i> Control de Pagos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('egresos', this)"><i class="bi bi-cart me-1"></i> Egresos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('contratos', this)"><i class="bi bi-file-earmark-text me-1"></i> Contratos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('actas', this)"><i class="bi bi-briefcase me-1"></i> Actas de Comité</a></li>
        `;
        
        if (usuario.rol === 'ADMIN') {
            menuHTML += `
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('usuarios', this)"><i class="bi bi-people me-1"></i> Usuarios</a></li>
                <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('cuotas', this)"><i class="bi bi-wallet2 me-1"></i> Cuotas</a></li>
            `;
        }
        
        document.getElementById('menu-navegacion').innerHTML = menuHTML;
        document.getElementById('portal-admin').classList.remove('oculto');
        if(document.getElementById('portal-padre')) document.getElementById('portal-padre').classList.add('oculto');
        renderizarTodasLasTablasAdmin();
        renderizarDashboardCurso();
    } else {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarVistaPadre('estado', this)"><i class="bi bi-clock-history me-1"></i> Estado de Cuenta</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarVistaPadre('documentos', this)"><i class="bi bi-folder2-open me-1"></i> Documentos</a></li>
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
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        navbarToggler.click();
    }
}

function cambiarModuloAdmin(modulo, el) {
    document.querySelectorAll('#portal-admin > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    
    const moduloDiv = document.getElementById(`admin-modulo-${modulo}`);
    if (moduloDiv) moduloDiv.classList.remove('oculto');
    
    if (el) el.classList.add('active');
    cerrarMenuMobile();
}

function cambiarVistaPadre(vista, el) {
    document.querySelectorAll('#portal-padre > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(`padre-vista-${vista}`).classList.remove('oculto');
    el.classList.add('active');
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
            const btnVoucher = p.voucher_b64 ? `<button class="btn btn-sm btn-info" onclick="abrirVoucher(${p.id})"><i class="bi bi-image"></i></button>` : '-';

            tp.innerHTML += `<tr>
                <td class="fw-bold text-dark text-start">${nombreCompleto}</td>
                <td class="text-primary fw-bold">${p.usuario}</td>
                <td>${p.fecha}</td>
                <td>${p.voucher} ${btnVoucher}</td>
                <td class="fw-bold text-success">$${p.valor.toFixed(2)}</td>
                <td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'}">${p.estado}</span></td>
                <td>${p.estado==='PENDIENTE'?`<button class="btn btn-sm btn-outline-primary fw-bold" onclick="validarPago(${p.id})"><i class="bi bi-check2 me-1"></i>Aprobar</button>`:'<i class="bi bi-check-circle-fill text-success"></i>'}</td>
            </tr>`;
        });
    }
    
    const te = document.getElementById('tabla-egresos');
    if(te) {
        te.innerHTML = '';
        egresosGlobales.forEach(e => {
            te.innerHTML += `<tr><td>${e.fecha}</td><td class="fw-bold text-dark">${e.descripcion}</td><td>${e.proveedor}</td><td class="fw-bold text-danger">$${e.valor.toFixed(2)}</td></tr>`;
        });
    }

    const ta = document.getElementById('tabla-actas');
    if(ta) {
        ta.innerHTML = '';
        actasGlobales.forEach(a => {
            ta.innerHTML += `<tr><td>${a.fecha}</td><td class="fw-bold text-dark">${a.descripcion}</td><td><button class="btn btn-sm btn-outline-danger fw-bold" onclick="verActaPDF(${a.id})"><i class="bi bi-file-pdf me-1"></i>Ver Acta</button></td></tr>`;
        });
    }

    const tc = document.getElementById('tabla-cuotas'); 
    if(tc) {
        tc.innerHTML = '';
        usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
            tc.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td class="fw-bold text-dark">$${u.valor_total_pagar.toFixed(2)}</td><td><button class="btn btn-sm btn-outline-primary fw-bold" onclick="abrirModalCuota('${u.username}', ${u.valor_total_pagar})"><i class="bi bi-pencil me-1"></i>Modificar</button></td></tr>`;
        });
    }
    
    const tbDocs = document.getElementById('tabla-contratos'); 
    if(tbDocs) {
        tbDocs.innerHTML = '';
        if (contratosGlobales.length === 0) tbDocs.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay contratos registrados.</td></tr>`;
        contratosGlobales.forEach(c => {
            tbDocs.innerHTML += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${c.desc}</td><td>${c.prov}</td><td class="fw-bold">$${c.valor.toFixed(2)}</td><td><div class="form-check form-switch d-flex justify-content-center"><input class="form-check-input" type="checkbox" ${c.visible?'checked':''} onchange="toggleVisibleDoc(${c.id}, this.checked)"></div></td></tr>`;
        });
    }
}

function renderizarDashboardAdmin() {
    let pagosValidados = pagosGlobales.filter(p => p.estado === 'VALIDADO').reduce((s, p) => s + p.valor, 0);
    let totalIngresos = ingresosGlobales.reduce((s, i) => s + i.valor, 0) + pagosValidados;
    let totalEgresos = egresosGlobales.reduce((s, e) => s + e.valor, 0);
    
    if(document.getElementById('dash-ingresos')) document.getElementById('dash-ingresos').innerText = `$${totalIngresos.toFixed(2)}`;
    if(document.getElementById('dash-egresos')) document.getElementById('dash-egresos').innerText = `$${totalEgresos.toFixed(2)}`;
    if(document.getElementById('dash-saldo')) document.getElementById('dash-saldo').innerText = `$${(totalIngresos - totalEgresos).toFixed(2)}`;
}

async function renderizarDashboardCurso() {
    try {
        const resp = await fetch(`${API_URL}/dashboard/curso`);
        const data = await resp.json();
        if(data.exito) {
            const tc = document.getElementById('tabla-dashboard-curso');
            if(tc) {
                tc.innerHTML = '';
                data.datos.forEach(d => {
                    tc.innerHTML += `<tr>
                        <td class="fw-bold text-primary">${d.curso || 'Sin asignar'}</td>
                        <td class="fw-bold text-success">$${parseFloat(d.total_recaudado).toFixed(2)}</td>
                    </tr>`;
                });
            }
        }
    } catch (e) {
        console.error("Error cargando dashboard por curso", e);
    }
}

function abrirVoucher(idPago) {
    const pago = pagosGlobales.find(p => p.id == idPago);
    if(pago && pago.voucher_b64) {
        const w = window.open("");
        w.document.write(`<iframe width='100%' height='100%' src='${pago.voucher_b64}'></iframe>`);
    }
}

function leerArchivoComoBase64(file) { 
    return new Promise((res, rej) => { 
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
        voucherB64 = await leerArchivoComoBase64(fileInput.files[0]);
    }

    const p = { 
        usuario: document.getElementById('pago-usuario').value, 
        fecha: document.getElementById('pago-fecha').value, 
        voucher: document.getElementById('pago-voucher').value, 
        valor: parseFloat(document.getElementById('pago-valor').value),
        voucher_b64: voucherB64
    }; 
    
    try {
        const resp = await fetch(`${API_URL}/pagos`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) 
        }); 
        const data = await resp.json();

        if(resp.ok && data.exito) {
            bootstrap.Modal.getInstance(document.getElementById('modalPago')).hide(); 
            document.getElementById('form-pago').reset(); 
            mostrarAlerta("Registro guardado con éxito.", "✅"); 
            renderizarTodasLasTablasAdmin(); 
        } else {
            mostrarAlerta("Error al guardar.", "❌");
        }
    } catch(error) {
        mostrarAlerta("Error de conexión.", "❌");
    }
}

async function registrarEgreso(e) {
    e.preventDefault();
    const p = {
        fecha: document.getElementById('egreso-fecha').value,
        descripcion: document.getElementById('egreso-desc').value,
        proveedor: document.getElementById('egreso-prov').value,
        valor: parseFloat(document.getElementById('egreso-valor').value)
    };
    await fetch(`${API_URL}/egresos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    bootstrap.Modal.getInstance(document.getElementById('modalEgreso')).hide();
    document.getElementById('form-egreso').reset();
    mostrarAlerta("Egreso registrado correctamente.", "✅");
    renderizarTodasLasTablasAdmin();
}

async function subirActa(e) {
    e.preventDefault();
    const file = document.getElementById('acta-file').files[0];
    if(!file) return;
    const b64 = await leerArchivoComoBase64(file);
    const p = {
        fecha: document.getElementById('acta-fecha').value,
        descripcion: document.getElementById('acta-desc').value,
        archivoNombre: file.name,
        archivoData: b64
    };
    await fetch(`${API_URL}/actas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    bootstrap.Modal.getInstance(document.getElementById('modalActa')).hide();
    document.getElementById('form-acta').reset();
    mostrarAlerta("Acta subida correctamente.", "✅");
    renderizarTodasLasTablasAdmin();
}

async function verDocumentoPDF(id) { 
    const resp = await fetch(`${API_URL}/documentos/ver/${id}`); 
    const data = await resp.json(); 
    if(data.exito && data.base64) { 
        const win = window.open("");
        win.document.write(`<iframe width='100%' height='100%' src='${data.base64}'></iframe>`);
    } else {
        mostrarAlerta("Documento no encontrado o corrupto.", "❌"); 
    }
}

async function verActaPDF(id) { 
    const resp = await fetch(`${API_URL}/actas/ver/${id}`); 
    const data = await resp.json(); 
    if(data.exito && data.base64) { 
        const win = window.open("");
        win.document.write(`<iframe width='100%' height='100%' src='${data.base64}'></iframe>`);
    } else {
        mostrarAlerta("Acta no encontrada.", "❌"); 
    }
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
    await fetch(`${API_URL}/usuarios`, { 
        method: document.getElementById('usu-modo').value === "CREAR" ? 'POST' : 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
    bootstrap.Modal.getInstance(document.getElementById('modalUsuario')).hide();
    mostrarAlerta("Usuario guardado exitosamente.", "✅");
    renderizarTodasLasTablasAdmin();
}

async function toggleEstadoUsuario(username) {
    const u = usuariosBD.find(x => x.username === username);
    const nuevoEstado = u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await fetch(`${API_URL}/usuarios/estado`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username: username, estado: nuevoEstado }) 
    });
    renderizarTodasLasTablasAdmin();
}

function renderizarUsuarios() {
    const tb = document.getElementById('tabla-usuarios-admin'); 
    if(!tb) return;
    tb.innerHTML = '';
    usuariosBD.forEach(u => {
        let btnSt = u.estado === "ACTIVO" 
            ? `<button class="btn btn-sm btn-outline-danger fw-bold mt-1 mt-md-0" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-x-circle me-1"></i>Desactivar</button>` 
            : `<button class="btn btn-sm btn-outline-success fw-bold mt-1 mt-md-0" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-check-circle me-1"></i>Activar</button>`;
            
        tb.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td>${u.rol}</td><td>${u.curso||'-'}</td><td><span class="badge ${u.estado==='ACTIVO'?'bg-success':'bg-secondary'}">${u.estado}</span></td><td><div class="d-flex flex-column flex-md-row justify-content-center align-items-center"><button class="btn btn-sm btn-outline-primary fw-bold me-md-1" onclick="abrirModalUsuario('${u.username}')"><i class="bi bi-pencil me-1"></i>Editar</button>${btnSt}</div></td></tr>`;
    });
}

async function validarPago(id) { 
    await fetch(`${API_URL}/pagos/validar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) }); 
    mostrarAlerta("Transferencia aprobada.", "✅"); 
    renderizarTodasLasTablasAdmin(); 
}

function abrirModalCuota(user, val) { 
    document.getElementById('cuota-usu').value = user; 
    document.getElementById('nueva-cuota-input').value = val; 
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
    if(!file) return; 
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
    await fetch(`${API_URL}/documentos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); 
    bootstrap.Modal.getInstance(document.getElementById('modalContrato')).hide(); 
    document.getElementById('form-contrato').reset(); 
    mostrarAlerta("Contrato subido a la base de datos.", "✅"); 
    renderizarTodasLasTablasAdmin(); 
}

async function toggleVisibleDoc(id, val) { 
    await fetch(`${API_URL}/documentos/visible`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, visible: val ? 1 : 0 }) }); 
    renderizarTodasLasTablasAdmin(); 
}