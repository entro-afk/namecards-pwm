const {dbPostgres} = require('./config.json');
const { Pool } = require('pg');
const pool = new Pool({
  user: dbPostgres.user,
  host: dbPostgres.host,
  database: 'postgres',
  password: dbPostgres.pwd,
  port: dbPostgres.port,
});

module.exports = pool;