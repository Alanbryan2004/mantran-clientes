import { api } from './src/lib/api.ts'; // Node won't run this but I can test endpoints directly

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
    const projs = (await fetchRest(`/projetos?$filter=status eq 'Em Andamento'`)).value;
    console.log(`Projetos: ${projs.length}`);
    const pCols = (await fetchRest(`/projeto_colunas?$first=1000`)).value;
    console.log(`Cols: ${pCols.length}`);
    const pBases = (await fetchRest(`/projeto_bases?$first=2000`)).value;
    console.log(`Bases: ${pBases.length}`);
    const pDados = (await fetchRest(`/projeto_dados?$first=5000`)).value;
    console.log(`Dados: ${pDados.length}`);
  } catch (err) {
    console.error(err);
  }
}

test();
