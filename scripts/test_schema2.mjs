const query = `
  {
    __type(name: "leo_usuarios") {
      name
      fields {
        name
      }
    }
  }
`;
fetch('http://localhost:5000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
