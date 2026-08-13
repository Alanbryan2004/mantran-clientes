fetch('http://localhost:5000/api/leo_usuarios?$first=1').then(r => r.json()).then(console.log).catch(console.error);
