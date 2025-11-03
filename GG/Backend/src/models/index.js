import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Correct: models/index.js -> ../config/config.json
const configPath = path.resolve(__dirname, '../config/config.json');

const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = configFile[env];

const db = {};
let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const modelsDir = __dirname;

if (!fs.existsSync(modelsDir)) {
  throw new Error(`Models directory not found at: ${modelsDir}`);
}

const files = fs
  .readdirSync(modelsDir)
  .filter((file) =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.endsWith('.js') &&
    !file.endsWith('.test.js')
  );

for (const file of files) {
  const moduleUrl = pathToFileURL(path.join(modelsDir, file)).href;
  const modelModule = await import(moduleUrl);
  const model = modelModule.default(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

for (const modelName of Object.keys(db)) {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export { sequelize };
export default db;

// import dotenv from 'dotenv';
// import fs from 'fs';
// import path from 'path';
// import { Sequelize } from 'sequelize';

// dotenv.config();
// const configPath = path.resolve('./src/config/config.json');
// const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
// const __filename = import.meta.url;
// const __dirname = path.dirname(new URL(import.meta.url).pathname);
// const basename = path.basename(__filename);
// const env = process.env.NODE_ENV || 'development';
// const config = configFile[env];
// const db = {};

// let sequelize;
// if (config.use_env_variable) {
//   sequelize = new Sequelize(process.env[config.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(config.database, config.username, config.password, config);
// }

// const files = fs
//   .readdirSync(__dirname)
//   .filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js');

// for (const file of files) {
//   const modelModule = await import(path.join(__dirname, file));
//   const model = modelModule.default(sequelize, Sequelize.DataTypes);
//   db[model.name] = model;
// }

// for (const modelName of Object.keys(db)) {
//   if (db[modelName].associate) {
//     db[modelName].associate(db);
//   }
// }

// db.sequelize = sequelize;
// db.Sequelize = Sequelize;

// export { sequelize };
// export default db;