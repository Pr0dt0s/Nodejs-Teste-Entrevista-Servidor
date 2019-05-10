const mysql = require('mysql');
const config = require('../utils/config');
const uf_to_state = require("../utils/uf_to_state");
const XLSX = require('xlsx');
const path = require('path');

async function seed(con, data) {
    try {       
        console.log('Reading xlsx file ...');
        
        let data = XLSX.readFile('./src/db/test.xlsx', { sheetStubs: true });
        
        console.log('Parsing xlsx file ...');
        
        let json_data = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]], {
            defval:null,
            header:1
        });

        let headers = json_data[0];
        json_data.shift();
        
        console.log(`Found ${headers.length} headers`);
        console.log(...headers);

        console.log(`${json_data.length} entries found...`);

        const uf_index = headers.findIndex(name => name === 'UF');
        const state_index = headers.findIndex(name => name === 'ESTADO');

        //Uppercase UF and clean Null ESTADO
        if (uf_index !== -1 && state_index !== -1) {
            json_data = json_data.map(row => {
                row[uf_index] = row[uf_index].toUpperCase();
                
                //uncomment to clean only if 'NULL' or null or ''
                //if (row[state_index] === 'NULL' || row[state_index] === null || row[state_index] === '') {        
                row[state_index] = uf_to_state[row[uf_index]].toUpperCase();
                //}
                return row;
            });
        }

        const schema = mysql.createConnection({
            host: config.hostname,
            user: config.username,
            password: config.password,
        });
        
        schema.connect(err => { if (err) throw err });
        
        schema.query(`CREATE DATABASE ${config.database_name}`, (err, result) => {
            if (err.code !== 'ER_DB_CREATE_EXISTS') throw err;
            
            //if no error or database allready exists error continue
            let database = mysql.createConnection({
                host: config.hostname,
                user: config.username,
                password: config.password,
                database: config.database_name
            });
            database.connect((err) => { if (err) throw err });

            let create_table_query = `CREATE TABLE ${config.table_name}`
        });

        return json_data;
    } catch (err) {
        console.error(err);
        return {};
    }
};

module.exports = seed;