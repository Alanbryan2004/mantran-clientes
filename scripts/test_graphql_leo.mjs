const query = `{
  leo_empresas(first: 1000, orderBy: { cd_empresa: ASC }) {
    items {
      id
      cd_empresa
      nome_empresa
      tipo
      leo_usuarios {
        items {
          id
          login
          senha
        }
      }
      leo_modulos {
        items {
          id
          ativo
        }
      }
    }
  }
}`;
fetch('http://localhost:5000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
