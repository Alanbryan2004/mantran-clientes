async function test() {
  const query = '{ bases(filter: { nome_base: { eq: "dbMantran021" } }) { items { id nome_base clientes { id nome_empresa } } } }';
  const r = await fetch('http://localhost:5000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
}
test();
