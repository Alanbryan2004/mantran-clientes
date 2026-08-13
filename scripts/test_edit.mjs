// Node can't run this directly unless I compile it.

// Let's just use native fetch
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

async function test() {
  try {
    const clienteId = '2F2BD956-B726-4C74-9490-68AC2DDFC94C';
    console.log('Testing getUsuariosByCliente...');
    const res = await fetchRest(`/usuarios_gpo?$filter=cliente_id eq ${clienteId}`);
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}

test();
