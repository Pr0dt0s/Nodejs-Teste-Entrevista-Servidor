const {
    get_pool,
    get_schema,
    Mock_Database,
} = require('./db');
const config = require('../utils/config');
const uf_to_state = require('../utils/uf_to_state');
const uuid = require('uuid');
const XLSX = require('xlsx');
const fs = require('fs');

let done = false;
let seeding = false;

let reading = false;
let data_ready = false;

let preparing_database = false;
let database_ready = false;

let json_data = {
    rows: [],
    headers: [],
    date_index: -1,
    uf_index: -1,
    state_index: -1,
};

async function readXLSX() {
    try {
        let file = await new Promise((resolve, reject) => {
            console.log('Reading file, this can take a while ...');
            fs.readFile(config.filename, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        let workbook = await new Promise((resolve) => {
            console.log('Scanning xlsx file, this can take a while ...');
            resolve(XLSX.read(file));
        });
        let data = await new Promise((resolve) => {
            console.log('Parsing xlsx file to json ...');
            let shetname = workbook.SheetNames[0];
            resolve(XLSX.utils.sheet_to_json(workbook.Sheets[shetname], {
                defval: null,
                header: 1,
            }));
        });

        // headers
        json_data.headers = data[0].map(header => header.trim().replace(" ", "_").toLowerCase());

        // rows
        json_data.rows = data;
        json_data.rows.shift();
        // create a uuid for each row
        json_data.rows = json_data.rows.map(row => [uuid.v4(), ...row]);

        // special data indexes 
        json_data.date_index = json_data.headers.findIndex(name => name === 'data');
        json_data.uf_index = json_data.headers.findIndex(name => name === 'uf');
        json_data.state_index = json_data.headers.findIndex(name => name === 'estado');

        // compensate for added uuid in rows
        json_data.date_index += json_data.date_index !== -1 ? 1 : 0;
        json_data.uf_index += json_data.uf_index !== -1 ? 1 : 0;
        json_data.state_index += json_data.state_index !== -1 ? 1 : 0;

        console.log(`Found ${json_data.headers.length} headers.`);
        console.log(...json_data.headers);
        console.log(`${json_data.rows.length} entries found...`);

        //Uppercase UF and clean Null ESTADO
        if (json_data.uf_index !== -1 && json_data.state_index !== -1) {
            json_data.rows = json_data.rows.map(row => {
                row[json_data.uf_index] = row[json_data.uf_index].toUpperCase();

                //uncomment to clean only if 'NULL' or null or ''
                //if (row[state_index] === 'NULL' || row[state_index] === null || row[state_index] === '') {        
                row[json_data.state_index] =
                    uf_to_state[row[json_data.uf_index]].toUpperCase();
                //}
                return row;
            });
        }


        reading = false;
        data_ready = true;
    } catch (err) {
        console.error('Error reading excel file ...', err);
    }
    return data_ready;
}

async function checkOrCreateDatabase() {
    try {
        let database_found = false;
        let schema = get_schema();
        let result = await schema.query(`SHOW DATABASES LIKE '${config.database_name}'`);

        database_found = result.length === 1;

        if (database_found) {
            console.log('The database already exists.');
            database_ready = true;
        } else {
            console.log(`The database does not exist, atempting to create it...`);
            result = await schema.query(`CREATE DATABASE ${config.database_name}`);
            database_ready = true;
            preparing_database = false;
        }
    } catch (err) {
        console.error('There has been an error checking or creating the table', err);
    }
    return database_ready;
}

async function seedTable(force) {
    let pool = get_pool();
    try {
        let table_found = await pool.query(`SHOW TABLES LIKE '${config.table_name}'`)
            .then(result => result.length === 1);

        if (force && table_found) {
            console.log('Droping table.');
            await pool.query(`DROP TABLE ${config.table_name}`);
            table_found = false;
        }

        if (!table_found) {
            console.log('Atempting to create table ...');
            let create_table_query = `CREATE TABLE ${config.table_name} (uuid 
                VARCHAR(50) NOT NULL, PRIMARY KEY (uuid)`;

            json_data.headers.forEach((header, index) => {
                let type = 'VARCHAR(50)';
                let i = index + 1; //to acount for uuid

                // checking first entry to infer type
                if (!isNaN(parseInt(json_data.rows[0][i]))) {
                    type = json_data.rows[0][i] % 1 == 0 ? 'INT' : 'FLOAT';
                }

                if (json_data.date_index !== -1 && json_data.date_index === i) {
                    type = 'DATE';
                }

                create_table_query += `,${header} ${type} NULL`;
            });

            create_table_query += ');';

            await pool.query(create_table_query);
            console.log('Table created succesfully.');
        }
    } catch (err) {
        console.error('Error creating the table.', err);
    }

    //Seed

    let insert_query_s = `INSERT INTO ${config.table_name} (uuid`;

    json_data.headers.forEach(header => {
        insert_query_s += `,${header.trim().replace(" ", "_").toLowerCase()}`;
    });

    insert_query_s += ') VALUES (';
    let promises = [];
    json_data.rows.forEach(row => {
        let insert_query_end = '';
        let found_null = false;
        row.forEach((v, index) => {
            let text = `'${v}' ,`;
            if (index === json_data.date_index) {
                let date = XLSX.SSF.format('yy/mm/dd', v);
                text = `'${date}' ,`;
            }
            if (v === 'NULL' || v === 'null' || v === null) {
                v = config.replace_null ? "'0'" : "NULL";
                found_null = true;
                text = `${v} ,`;
            }
            insert_query_end += text;
        });
        insert_query_end = insert_query_end.slice(0, -1) + ');';
        if (found_null && config.omit_null) {
            return;
        }
        promises.push(pool.query(insert_query_s + insert_query_end));
    });
    await Promise.all(promises);
    console.log('Finished seeding the database.');
    done = true;
}

function resetDB() {
    done = false;
    seeding = false;
    database_ready = false;
    data_ready = false;
    reading = false;
    preparing_database = false;
    json_data = {
        rows: [],
        headers: [],
        date_index: -1,
        uf_index: -1,
        state_index: -1,
    };
    Mock_Database.usereal();
}

async function seedDB(force) {

    if (!done && seeding) return Promise.resolve(false);

    if (force) {
        resetDB();
    }

    if (done) return Promise.resolve(true);

    // read file if json data is empty and not reading already
    seeding = true;
    let readDataPromise = Promise.resolve(data_ready);
    if (!data_ready && !reading) {
        reading = true;
        readDataPromise = readXLSX();
    }

    let prepareDBPromise = Promise.resolve(database_ready);
    if (!database_ready && !preparing_database) {
        preparing_database = true;
        prepareDBPromise = checkOrCreateDatabase();
    }

    await Promise.all([readDataPromise, prepareDBPromise]);
    if (data_ready && database_ready) {
        await seedTable(force);
    } else if (data_ready && !database_ready) {
        console.log('Switching to in memory database');
        Mock_Database.loadData(json_data);
        done = true;
    }
    seeding = false;
    return done;
}

module.exports = seedDB;