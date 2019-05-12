const mysql = require('promise-mysql');
const config = require('../utils/config');

const schema = mysql.createPool({
    host: config.hostname,
    user: config.username,
    password: config.password
});

const pool = mysql.createPool({
    host: config.hostname,
    user: config.username,
    password: config.password,
    database: config.database_name
});

module.exports = {
    schema,
    pool
};