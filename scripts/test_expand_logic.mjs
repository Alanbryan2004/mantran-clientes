const API_URL = 'http://localhost:5000/api';
async function test() {
  const res = await fetch(`${API_URL}/bases?$expand=clientes&$first=1000`);
  const data = await res.json();
  const available = data.value.filter(b => {
    // If it has no cliente_id
    if (!b.cliente_id) return true;
    const c = Array.isArray(b.clientes) ? b.clientes[0] : b.clientes;
    // Or if the expanded cliente has no nome_empresa (maybe it's a deleted client?)
    return !c || !c.nome_empresa;
  });
  console.log("Total available using $expand logic:", available.length);
  
  const justBases = await fetch(`${API_URL}/bases?$first=1000`);
  const justBasesData = await justBases.json();
  const justAvailable = justBasesData.value.filter(b => b.cliente_id === null);
  console.log("Total available using cliente_id === null:", justAvailable.length);
}
test();
