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
    console.log('Fetching a base with a client...');
    const res = await fetchRest(`/bases?$filter=cliente_id ne null&$top=1`);
    if (!res || !res.value || res.value.length === 0) {
      console.log('No base with client found.');
      return;
    }
    const base = res.value[0];
    const baseId = base.id;
    const clienteId = base.cliente_id;
    
    console.log(`Updating Base ${baseId} to set cliente_id = null...`);
    await fetchRest(`/bases/id/${baseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ cliente_id: null, status: 'Disponível' })
    });
    console.log('Base updated!');
    
  } catch (err) {
    console.error(err);
  }
}

test();
