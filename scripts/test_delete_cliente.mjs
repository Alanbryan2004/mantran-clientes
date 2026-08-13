const API_URL = 'http://localhost:5000/api';

async function fetchRest(endpoint, options) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status !== 204) {
        const errText = await res.text();
        throw new Error(`REST Error (${res.status}): ${errText}`);
    }
  }
  if (res.status === 204) return null;
  return await res.json();
}

async function getUsuariosByCliente(clienteId) {
    const res = await fetchRest(`/usuarios_gpo?$filter=cliente_id eq ${clienteId}`);
    return res.value;
}
async function deleteUsuariosByCliente(clienteId) {
    const usuarios = await getUsuariosByCliente(clienteId);
    for (const u of usuarios) {
      await fetchRest(`/usuarios_gpo/id/${u.id}`, { method: 'DELETE' });
    }
}
async function deleteModulosByCliente(clienteId) {
    const res = await fetchRest(`/modulos?$filter=cliente_id eq ${clienteId}`);
    for (const m of res.value) {
      await fetchRest(`/modulos/id/${m.id}`, { method: 'DELETE' });
    }
}
async function deleteCliente(clienteId) {
    await fetchRest(`/clientes/id/${clienteId}`, {
      method: 'DELETE'
    });
}
async function updateBase(baseId, updates) {
    await fetchRest(`/bases/id/${baseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
}

async function test() {
  try {
    const clienteId = '2F2BD956-B726-4C74-9490-68AC2DDFC94C'; // ENTREGATEX
    const baseId = 'E10052BD-BDFA-405B-B7DB-FBE9A3026857'; // Example, let's fetch it first
    console.log('Fetching base for ENTREGATEX...');
    const resBase = await fetchRest(`/bases?$filter=cliente_id eq ${clienteId}`);
    if (resBase.value.length > 0) {
      const bId = resBase.value[0].id;
      console.log('Updating Base to null...');
      await updateBase(bId, { cliente_id: null, status: 'Disponível' });
    }
    
    console.log('Deleting usuarios_gpo...');
    await deleteUsuariosByCliente(clienteId);
    
    console.log('Deleting modulos...');
    await deleteModulosByCliente(clienteId);
    
    console.log('Deleting cliente...');
    await deleteCliente(clienteId);
    
    console.log('SUCCESS!');
  } catch (err) {
    console.error(err);
  }
}

test();
