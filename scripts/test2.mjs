async function test() {
  const bRes = await fetch("http://localhost:5000/api/bases?$filter=nome_base eq 'dbMantran021'");
  const d = await bRes.json();
  console.log(d.value[0].cliente_id);
}
test();
