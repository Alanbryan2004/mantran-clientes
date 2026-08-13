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

async function getBases() {
    const res = await fetchRest('/bases?$first=1000');
    return res.value;
}

async function getClientes() {
    const res = await fetchRest('/clientes?$first=1000');
    return res.value;
}

async function getLeoEmpresas() {
    const res = await fetchRest('/leo_empresas?$first=1000');
    return res.value;
}

async function test() {
  try {
    const bases = await getBases();
    console.log(`Bases: ${bases.length}`);
    const clientes = await getClientes();
    console.log(`Clientes: ${clientes.length}`);
    const leo = await getLeoEmpresas();
    console.log(`Leo Empresas: ${leo.length}`);
  } catch (err) {
    console.error(err);
  }
}

test();
