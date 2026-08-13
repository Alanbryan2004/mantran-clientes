const q = {
  query: `{
    bases {
      items {
        id
        nome_base
        status
        migrada
        clientes {
          id
          nome_empresa
          tipo
          possui_aditivo
          modulos {
            items {
              nome_modulo
              ativo
            }
          }
          usuarios_gpo {
            items {
              login
              senha
            }
          }
        }
      }
    }
  }`
};

fetch('http://localhost:5000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(q)
}).then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
