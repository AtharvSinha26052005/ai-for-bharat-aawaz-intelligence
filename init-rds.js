const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function init() {
  const masterUrl = 'postgresql://postgres:aawaz123@aawaz-db.c4n44emagfee.us-east-1.rds.amazonaws.com:5432/postgres';
  const targetDb = 'rural_digital_rights';
  const pgClient = new Client({ connectionString: masterUrl, ssl: { rejectUnauthorized: false } });

  try {
    await pgClient.connect();
    console.log('Connected to postgres db');
    
    const res = await pgClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${targetDb}'`);
    if (res.rowCount === 0) {
      console.log(`Creating database ${targetDb}...`);
      await pgClient.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Database ${targetDb} created successfully.`);
    } else {
      console.log(`Database ${targetDb} already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await pgClient.end();
  }

  const targetUrl = 'postgresql://postgres:aawaz123@aawaz-db.c4n44emagfee.us-east-1.rds.amazonaws.com:5432/rural_digital_rights';
  const dbClient = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  try {
    await dbClient.connect();
    console.log(`Connected to target database ${targetDb}`);

    const sqlPath = path.join(__dirname, 'scripts', 'init-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing initialization script...');
    await dbClient.query(sql);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await dbClient.end();
  }
}

init();
