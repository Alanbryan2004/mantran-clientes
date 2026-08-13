const fs = require('fs');

const data = fs.readFileSync('dab-config.json', 'utf8');
// It might be UTF-16 LE, let's parse it safely
let json;
try {
  json = JSON.parse(data);
} catch(e) {
  // Try UTF-16 LE
  const utf16data = fs.readFileSync('dab-config.json', 'utf16le');
  json = JSON.parse(utf16data);
}

if (json.entities && json.entities.leo_empresas) {
  json.entities.leo_empresas.relationships = {
    leo_usuarios: {
      cardinality: "many",
      "target.entity": "leo_usuarios",
      "source.fields": ["id"],
      "target.fields": ["leo_empresa_id"]
    },
    leo_modulos: {
      cardinality: "many",
      "target.entity": "leo_modulos",
      "source.fields": ["id"],
      "target.fields": ["leo_empresa_id"]
    }
  };
  fs.writeFileSync('dab-config.json', JSON.stringify(json, null, 2));
  console.log("Successfully updated dab-config.json");
} else {
  console.log("Entity leo_empresas not found!");
}
