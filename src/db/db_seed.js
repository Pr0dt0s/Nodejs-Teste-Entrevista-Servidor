const mysql = require('mysql');
const config = require('../utils/config');
const uf_to_state = require('../utils/uf_to_state');
const append_uuid = require('../utils/append_uuid');
const XLSX = require('xlsx');

let done = false;
let working = false;

function seed() {
    if (done || working) return done;
    working = true;
    console.log('Reading xlsx file, this can take a while ...');
    
    let data = XLSX.readFile('./src/db/BASE.xlsx', {
        sheetStubs: true
    });
    
    console.log('Parsing xlsx file, this can take a while ...');
    
    let json_data = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]], {
        defval:null,
        header: 1
    });

    let headers = json_data[0];
    json_data.shift();
    
    console.log(`Found ${headers.length} headers`);
    console.log(...headers);

    console.log(`${json_data.length} entries found...`);

    const date_index = headers.findIndex(name => name === 'DATA');
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
    
    console.log('Atempting to create database ...');
    schema.query(`CREATE DATABASE ${config.database_name};`, (err, result) => {
        if (err && err.code !== 'ER_DB_CREATE_EXISTS') throw err;
        
        if (err) {
            console.log('Database already exists.');
        } else {
            console.log('Database created succesfully.');
        }
        //if no error or database allready exists error continue
        let database = mysql.createConnection({
            host: config.hostname,
            user: config.username,
            password: config.password,
            database: config.database_name
        });
        database.connect((err) => { if (err) throw err });

        let create_table_query = `CREATE TABLE ${config.table_name} (uuid VARCHAR(50) NOT NULL,
            PRIMARY KEY (uuid)`;
        
        headers.forEach((header, index) => {
            let type = 'VARCHAR(50)';
            
            if (!isNaN(parseInt(json_data[0][index]))) {
                type = json_data[0][index]%1 == 0 ? 'INT' : 'FLOAT';
            }
            
            if (date_index !== -1 && date_index === index) {
                type = 'DATE';
            }
            
            create_table_query += `,${header.trim().replace(" ", "_").toLowerCase()} ${type} NULL`; 
        });

        create_table_query+=');'
        
        console.log('Atempting to create table ...');
        database.query(create_table_query, (err, result) => {
            if (err && err.code !== 'ER_TABLE_EXISTS_ERROR') throw err;

            if (err) {
                console.log('Table already exists.');
                done = true;
                //database.destroy();
            } else {
                console.log('Table created succesfully.');
            }
        });
        
        //database.query();
        json_data = append_uuid(json_data);
        let insert_query_s = `INSERT INTO ${config.table_name} (uuid`;

        headers.forEach((header, index) => {
            insert_query_s += `,${header.trim().replace(" ", "_").toLowerCase()}`; 
        });

        insert_query_s += ') VALUES (';            
        json_data.forEach((row,rindex) => {
            let insert_query_end = '';
            row.forEach((v, index) => {
                if (index === date_index + 1) {
                    let date = XLSX.SSF.format('yy/mm/dd', v);
                    insert_query_end += `'${date}' ,`;
                    return;
                }
                insert_query_end += `'${v}' ,`;
            });
            insert_query_end = insert_query_end.slice(0, -1) + ');';
            database.query(insert_query_s+insert_query_end, (err, result) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                if (rindex === json_data.length - 1) {
                    done = true;
                }
            });
            //database.end();
        })
    });
    return done;
};

module.exports = seed;