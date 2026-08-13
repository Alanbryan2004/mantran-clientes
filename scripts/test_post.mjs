async function test() {
  const cRes = await fetch("http://localhost:5000/api/clientes", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_empresa: "TEST POST", tipo: "NORMAL", possui_aditivo: false })
  });
  const data = await cRes.json();
  console.log("POST Response:", data);
}
test();
