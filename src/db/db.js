const mysql = require('promise-mysql');
const config = require('../utils/config');
const Parser = require('flora-sql-parser').Parser;

const schema = mysql.createPool({
    host: config.hostname,
    user: config.username,
    password: config.password,
});

const pool = mysql.createPool({
    host: config.hostname,
    user: config.username,
    password: config.password,
    database: config.database_name,
});

let useMockDB = false;

// Mocking only the select query for enviroments without mysql server
const Mock_Database = {
    headers: [],
    data: [],
    usereal: () => {
        useMockDB = false;
    },
    loadData: (json_data) => {
        this.data = json_data;
        this.headers = ['uuid', ...json_data.headers];
        useMockDB = true;
    },
    query: (query_string = '') => {
        try {
            // return Headers as MySQL does
            if (query_string.startsWith('SELECT COLUMN_NAME')) {
                return Promise.resolve(this.headers.map(header => ({
                    COLUMN_NAME: header,
                })));
            }
            let par = new Parser();
            let query_obj = par.parse(query_string);

            if (query_obj.type !== 'select') {
                throw new Error('Only select queries implemented with mock database.');
            }
            if (query_obj.from.length !== 1 || query_obj.from[0].table !== config.table_name) {
                throw new Error(`Can only query table: ${config.table_name}.`);
            }
            let requested = query_obj.columns === '*' ? this.headers : query_obj.columns;
            let requested_indexes = requested.map(header => this.headers.findIndex(header));

            // for each row make a new row consisting of the values of the indexes
            let response = this.data.rows.map(row => requested_indexes.map(index => row[index]));
            return Promise.resolve(response);
            // filter and order
        } catch (err) {
            console.error('Problem parsing sql query.', err);
            return Promise.reject(err);
        }
    },
};

function query(args) {
    if (useMockDB) {
        return Mock_Database.query(args);
    }
    return pool.query(args);
}

module.exports = {
    schema,
    pool,
    query,
    Mock_Database,
};