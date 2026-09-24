// --- VARIABLES GLOBALES ---
let usuariosBD = [], pagosGlobales = [], ingresosGlobales = [], egresosGlobales = [];
let contratosGlobales = [], actasGlobales = [], cotizacionesGlobales = [];
let usuarioActual = null;

const API_URL = "/api"; 

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('vista-app').classList.add('oculto');
    document.getElementById('vista-login').classList.remove('oculto');

    // Escuchadores de eventos para formularios
    document.getElementById('form-login').addEventListener('submit', iniciarSesion);
    document.getElementById('form-forzar-clave').addEventListener('submit', guardarClaveForzada);
    
    const formUsuario = document.getElementById('form-usuario');
    if (formUsuario) formUsuario.addEventListener('submit', guardarUsuario);
    
    const formPago = document.getElementById('form-pago');
    if (formPago) formPago.addEventListener('submit', registrarPago);
    
    const formCuota = document.getElementById('form-cuota');
    if (formCuota) formCuota.addEventListener('submit', guardarNuevaCuota);
    
    const formContrato = document.getElementById('form-contrato');
    if (formContrato) formContrato.addEventListener('submit', (e) => subirDocumento(e, 'CONTRATO'));
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
        usuariosBD = data.usuarios; 
        pagosGlobales = data.pagos;
        ingresosGlobales = data.ingresos; 
        egresosGlobales = data.egresos;
        contratosGlobales = data.contratos;
    } catch (e) {
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
        mostrarAlerta("Error de conexión. Verifica que app.py esté corriendo.", "❌"); 
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

    if (usuario.rol === 'ADMIN') {
        document.getElementById('menu-navegacion').innerHTML = `
            <li class="nav-item"><a class="nav-link active" style="cursor:pointer" onclick="cambiarModuloAdmin('resumen', this)"><i class="bi bi-grid me-1"></i> Resumen</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('usuarios', this)"><i class="bi bi-people me-1"></i> Usuarios</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('pagos', this)"><i class="bi bi-journal-check me-1"></i> Control de Pagos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('contratos', this)"><i class="bi bi-file-earmark-text me-1"></i> Contratos</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('cuotas', this)"><i class="bi bi-wallet2 me-1"></i> Cuotas</a></li>
            <li class="nav-item"><a class="nav-link" style="cursor:pointer" onclick="cambiarModuloAdmin('claves', this)"><i class="bi bi-key me-1"></i> Claves</a></li>
        `;
        document.getElementById('portal-admin').classList.remove('oculto');
        document.getElementById('portal-padre').classList.add('oculto');
        renderizarTodasLasTablasAdmin();
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
    if (navbarCollapse.classList.contains('show')) {
        navbarToggler.click();
    }
}

function cambiarModuloAdmin(modulo, el) {
    document.querySelectorAll('#portal-admin > div').forEach(d => d.classList.add('oculto'));
    document.querySelectorAll('#menu-navegacion .nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById(`admin-modulo-${modulo}`).classList.remove('oculto');
    el.classList.add('active');
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
    
    // Llenar la lista desplegable de padres en el modal de pago
    const selectPadres = document.getElementById('pago-usuario');
    if(selectPadres) {
        selectPadres.innerHTML = '<option value="">-- Seleccione un padre --</option>';
        usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
            selectPadres.innerHTML += `<option value="${u.username}">${u.nombre} (${u.username})</option>`;
        });
    }

    // Tabla de Pagos (Ahora incluye NOMBRES)
    const tp = document.getElementById('tabla-pagos'); 
    tp.innerHTML = '';
    pagosGlobales.forEach(p => {
        const datosUsuario = usuariosBD.find(u => u.username === p.usuario);
        const nombreCompleto = datosUsuario ? datosUsuario.nombre : 'Usuario Desconocido';

        tp.innerHTML += `<tr>
            <td class="fw-bold text-dark text-start">${nombreCompleto}</td>
            <td class="text-primary fw-bold">${p.usuario}</td>
            <td>${p.fecha}</td>
            <td>${p.voucher}</td>
            <td class="fw-bold text-success">$${p.valor.toFixed(2)}</td>
            <td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'}">${p.estado}</span></td>
            <td>${p.estado==='PENDIENTE'?`<button class="btn btn-sm btn-outline-primary fw-bold" onclick="validarPago(${p.id})"><i class="bi bi-check2 me-1"></i>Aprobar</button>`:'<i class="bi bi-check-circle-fill text-success"></i>'}</td>
        </tr>`;
    });
    
    const tc = document.getElementById('tabla-cuotas'); 
    tc.innerHTML = '';
    usuariosBD.filter(u => u.rol === 'PADRE').forEach(u => {
        tc.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td class="fw-bold text-dark">$${u.valor_total_pagar.toFixed(2)}</td><td><button class="btn btn-sm btn-outline-primary fw-bold" onclick="abrirModalCuota('${u.username}', ${u.valor_total_pagar})"><i class="bi bi-pencil me-1"></i>Modificar</button></td></tr>`;
    });
    
    const tbDocs = document.getElementById('tabla-contratos'); 
    tbDocs.innerHTML = '';
    if (contratosGlobales.length === 0) tbDocs.innerHTML = `<tr><td colspan="5" class="text-muted py-4">No hay contratos registrados.</td></tr>`;
    contratosGlobales.forEach(c => {
        tbDocs.innerHTML += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${c.desc}</td><td>${c.prov}</td><td class="fw-bold">$${c.valor.toFixed(2)}</td><td><div class="form-check form-switch d-flex justify-content-center"><input class="form-check-input" type="checkbox" ${c.visible?'checked':''} onchange="toggleVisibleDoc(${c.id}, this.checked)"></div></td></tr>`;
    });
}

function renderizarDashboardAdmin() {
    let pagosValidados = pagosGlobales.filter(p => p.estado === 'VALIDADO').reduce((s, p) => s + p.valor, 0);
    let totalIngresos = ingresosGlobales.reduce((s, i) => s + i.valor, 0) + pagosValidados;
    let totalEgresos = egresosGlobales.reduce((s, e) => s + e.valor, 0);
    
    document.getElementById('dash-ingresos').innerText = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('dash-egresos').innerText = `$${totalEgresos.toFixed(2)}`;
    document.getElementById('dash-saldo').innerText = `$${(totalIngresos - totalEgresos).toFixed(2)}`;
}

function actualizarDashboardPadre() {
    cargarDatosDesdeServidor().then(() => {
        const userDatos = usuariosBD.find(u => u.username === usuarioActual.username);
        const misPagos = pagosGlobales.filter(p => p.usuario === usuarioActual.username);
        let totalPagado = misPagos.filter(p => p.estado === 'VALIDADO').reduce((sum, p) => sum + p.valor, 0);
        let pendiente = userDatos.valor_total_pagar - totalPagado;

        document.getElementById('lbl-total-pagar').innerText = `$${userDatos.valor_total_pagar.toFixed(2)}`;
        document.getElementById('lbl-pagado').innerText = `$${totalPagado.toFixed(2)}`;
        document.getElementById('lbl-pendiente').innerText = `$${pendiente.toFixed(2)}`;

        const tb = document.getElementById('tabla-pagos-padre'); 
        tb.innerHTML = '';
        if(misPagos.length === 0) tb.innerHTML = `<tr><td colspan="4" class="text-muted py-4">No hay transferencias registradas.</td></tr>`;
        misPagos.forEach(p => {
            tb.innerHTML += `<tr><td>${p.fecha}</td><td>${p.voucher}</td><td class="text-success fw-bold">$${p.valor.toFixed(2)}</td><td><span class="badge ${p.estado==='VALIDADO'?'bg-success':'bg-warning text-dark'}">${p.estado}</span></td></tr>`;
        });

        const tbd = document.getElementById('tabla-docs-padre'); 
        tbd.innerHTML = '';
        const docsVisibles = contratosGlobales.filter(c => c.visible);
        if(docsVisibles.length === 0) tbd.innerHTML = `<tr><td colspan="3" class="text-muted py-4">No hay documentos públicos habilitados.</td></tr>`;
        docsVisibles.forEach(c => {
            tbd.innerHTML += `<tr><td>${c.fecha}</td><td class="fw-bold text-dark">${c.desc}</td><td><button class="btn btn-sm btn-outline-danger fw-bold" onclick="verDocumentoPDF(${c.id})"><i class="bi bi-file-pdf me-1"></i>Ver PDF</button></td></tr>`;
        });
    });
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
    tb.innerHTML = '';
    usuariosBD.forEach(u => {
        let btnSt = u.estado === "ACTIVO" 
            ? `<button class="btn btn-sm btn-outline-danger fw-bold mt-1 mt-md-0" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-x-circle me-1"></i>Desactivar</button>` 
            : `<button class="btn btn-sm btn-outline-success fw-bold mt-1 mt-md-0" onclick="toggleEstadoUsuario('${u.username}')"><i class="bi bi-check-circle me-1"></i>Activar</button>`;
            
        tb.innerHTML += `<tr><td class="text-primary fw-bold">${u.username}</td><td>${u.nombre}</td><td>${u.rol}</td><td>${u.curso||'-'}</td><td><span class="badge ${u.estado==='ACTIVO'?'bg-success':'bg-secondary'}">${u.estado}</span></td><td><div class="d-flex flex-column flex-md-row justify-content-center align-items-center"><button class="btn btn-sm btn-outline-primary fw-bold me-md-1" onclick="abrirModalUsuario('${u.username}')"><i class="bi bi-pencil me-1"></i>Editar</button>${btnSt}</div></td></tr>`;
    });
}

// Nueva función de registro de pago con manejo de errores
async function registrarPago(e) { 
    e.preventDefault(); 
    
    const p = { 
        usuario: document.getElementById('pago-usuario').value, 
        fecha: document.getElementById('pago-fecha').value, 
        voucher: document.getElementById('pago-voucher').value, 
        valor: parseFloat(document.getElementById('pago-valor').value) 
    }; 
    
    try {
        const resp = await fetch(`${API_URL}/pagos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(p) 
        }); 
        
        const data = await resp.json();

        if(resp.ok && data.exito !== false) {
            bootstrap.Modal.getInstance(document.getElementById('modalPago')).hide(); 
            document.getElementById('form-pago').reset(); 
            mostrarAlerta("Registro guardado con éxito.", "✅"); 
            renderizarTodasLasTablasAdmin(); 
        } else {
            mostrarAlerta("Error al guardar: " + (data.mensaje || "Revisa los datos."), "❌");
        }
    } catch(error) {
        mostrarAlerta("Error de conexión al intentar guardar.", "❌");
    }
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

function leerArchivoComoBase64(file) { 
    return new Promise((res, rej) => { 
        const reader = new FileReader(); 
        reader.onload = () => res(reader.result); 
        reader.onerror = rej; 
        reader.readAsDataURL(file); 
    }); 
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

async function verDocumentoPDF(id) { 
    const resp = await fetch(`${API_URL}/documentos/ver/${id}`); 
    const data = await resp.json(); 
    if(data.exito) { 
        fetch(data.base64).then(r => r.blob()).then(blob => window.open(URL.createObjectURL(blob), '_blank')); 
    } else {
        mostrarAlerta("Error al cargar PDF", "❌"); 
    }
}