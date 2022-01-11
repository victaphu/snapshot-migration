const mysql = require('mysql');
const Pool = require('mysql/lib/Pool');
const Connection = require('mysql/lib/Connection');
const bluebird = require('bluebird');
const parse = require('connection-string');

const createDb = (dbURL) => {
    const connectionLimit = parseInt(process.env.CONNECTION_LIMIT || '25');
    console.log('Connection limit', connectionLimit);

    // @ts-ignore
    const config = new parse.ConnectionString(dbURL);
    console.log(config, dbURL);
    config.connectionLimit = connectionLimit;
    config.multipleStatements = true;
    config.database = config.path[0];
    config.host = config.hosts[0].name;
    config.port = config.hosts[0].port;
    config.connectTimeout = 30000;
    config.charset = 'utf8mb4';
    bluebird.promisifyAll([Pool, Connection]);
    const db = mysql.createPool(config);

    return db;
}

const sourceDB = createDb(process.env.SOURCE_DB_URL);
const destinationDB = createDb(process.env.DEST_DB_URL);

const dbs = [sourceDB, destinationDB];

module.exports = {
    dbs
}
