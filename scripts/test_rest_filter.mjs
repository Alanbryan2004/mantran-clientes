fetch('http://localhost:5000/api/leo_usuarios?$filter=leo_empresa_id eq \\'C4F5018D-7C2C-4C98-A533-DB0C21C09FD8\\'').then(r => r.json()).then(console.log).catch(console.error);
