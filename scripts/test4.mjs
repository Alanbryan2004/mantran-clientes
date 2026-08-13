async function test() {
  const r = await fetch('http://localhost:5000/api/bases?$first=1');
  const d = await r.json();
  const base = d.value[0];
  console.log('Testing updateBase on', base.id);
  const patchRes = await fetch('http://localhost:5000/api/bases/id/' + base.id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: base.status })
  });
  console.log('PATCH Status:', patchRes.status);
  if (!patchRes.ok) console.log(await patchRes.text());
}
test();
