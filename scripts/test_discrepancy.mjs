const API_URL = 'http://localhost:5000/api';

async function fetchRest(endpoint) {
  const res = await fetch(`${API_URL}${endpoint}`);
  return await res.json();
}

async function test() {
  const bases = await fetchRest('/bases?$first=1000');
  const availableBases = bases.value.filter(b => b.cliente_id === null);
  console.log("Bases com cliente_id === null:", availableBases.map(b => b.nome_base));
  
  const basesExpand = await fetchRest('/bases?$expand=clientes&$first=1000');
  const availableBasesExpand = basesExpand.value.filter(b => {
      const c = Array.isArray(b.clientes) ? b.clientes[0] : b.clientes;
      return !c || !c.nome_empresa;
  });
  console.log("Bases com !nome_empresa (via expand):", availableBasesExpand.map(b => b.nome_base));
}

test();
