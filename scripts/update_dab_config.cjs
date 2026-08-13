const fs = require('fs');
const path = './dab-config.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));

// Initialize if undefined
if (!config.entities.bases.relationships) config.entities.bases.relationships = {};
if (!config.entities.clientes.relationships) config.entities.clientes.relationships = {};

// Add bases -> clientes
config.entities.bases.relationships = {
  clientes: {
    cardinality: "one",
    "target.entity": "clientes",
    "source.fields": ["cliente_id"],
    "target.fields": ["id"]
  }
};

// Add clientes -> modulos and usuarios_gpo
config.entities.clientes.relationships = {
  modulos: {
    cardinality: "many",
    "target.entity": "modulos",
    "source.fields": ["id"],
    "target.fields": ["cliente_id"]
  },
  usuarios_gpo: {
    cardinality: "many",
    "target.entity": "usuarios_gpo",
    "source.fields": ["id"],
    "target.fields": ["cliente_id"]
  }
};

fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Relationships updated in dab-config.json successfully!');
