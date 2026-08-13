const fs = require('fs');

const data = fs.readFileSync('dab-config.json', 'utf8');
let json;
try {
  json = JSON.parse(data);
} catch(e) {
  const utf16data = fs.readFileSync('dab-config.json', 'utf16le');
  json = JSON.parse(utf16data);
}

if (json.entities && json.entities.leo_empresas && json.entities.leo_empresas.relationships && json.entities.leo_empresas.relationships.leo_modulos) {
  json.entities.leo_empresas.relationships.leo_modulos.target.fields = ["empresa_id"];
  fs.writeFileSync('dab-config.json', JSON.stringify(json, null, 2));
  console.log("Successfully updated dab-config.json for leo_modulos target.fields");
} else {
  console.log("Entity leo_empresas or relationships not found!");
}
