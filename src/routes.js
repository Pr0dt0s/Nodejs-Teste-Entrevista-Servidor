/* eslint-disable indent-legacy, indent, array-bracket-newline*/
const {
    query,
} = require('./db/db');
const seed = require('./db/db_seed');
const config = require('./utils/config');

let defined_routes = [{
        route: 'GET /',
        description: 'This page.',
        parameters: null,
    },
    {
        route: 'GET /api/headers',
        description: 'Used to obtain all the headers in the database.',
        parameters: null,
    },
    {
        route: 'GET /api/seed_sql',
        description: 'Used to read the xlsx file and seed the configured database.',
        parameters: {
            type: 'query',
            name: 'force',
            description: 'Boolean to force the reload and reseed of the database.',
        },
    },
    {
        route: 'POST /api/query',
        description: 'Used to send a query to the connected database.',
        parameters: {
            type: 'body/json',
            name: 'query',
            description: 'query to execute against the database.',
        },
    },
    {
        route: 'GET /api/config',
        description: 'Used to check the server`s configuration.',
        parameters: null,
    },
    {
        route: 'POST /api/config',
        description: 'Used to change the server`s configuration.',
        parameters: {
            type: 'body/json',
            name: 'config',
            description: `config object only with the parameters that will be updated available 
            ---MySQL---
            hostname
            mysql_port
            username
            password
            database_name
            table_name
            ---Excel parsing options---
            replace_null
            omit_null`,
        },
    },
];

function routes(app) {

    app.get('/', (req, res) => res.status(200).json(defined_routes));

    app.get("/api/seed_sql", (req, res) => {

        console.log(`Atempting to seed the database ...`);
        let force = req.query.force === 'true' || req.query.force === 'TRUE';
        let seedPromise = seed(force);
        seedPromise.then(done => {
            console.log(`Seeding is ${done ? '' : 'not '}complete`);
            res.json({
                'seeded': done,
            });
        });
    });

    app.get('/api/headers', (req, res) => {
        query(`SELECT COLUMN_NAME FROM information_schema.columns
         WHERE table_schema='${config.database_name}' AND table_name='${config.table_name}'
         ORDER BY ORDINAL_POSITION `)
            .then(response => {
                res.json(response);
            })
            .catch(err => {
                console.error('Error requesting headers.', err);
                res.json({
                    msg: 'Something wrong reading the headers, make sure to GET "/api/seed_sql" first, or GET "/api/seed_sql?force=true" to force a reseed of the db.',
                });
            });
    });

    app.post('/api/query', (req, res) => {
        if (req.body && req.body.query) {
            query(req.body.query).then(response => {
                res.json(response);
            }).catch(err => {
                res.json(err);
            });
        } else {
            res.json({
                msg: 'You should probably send a query.',
            });
        }
    });

    app.get('/api/config', (req, res) => {
        res.json({
            hostname: config.hostname,
            mysql_port: config.mysql_port,
            username: config.username,
            password: config.password,
            database_name: config.database_name,
            table_name: config.table_name,
            replace_null: config.replace_null,
            omit_null: config.omit_null,
        });
    });

    app.post('/api/config', (req, res) => {
        let newconfig = req.body ? req.body.newconfig : false;
        if (newconfig) {
            config.updateConfig(newconfig);
            res.redirect('/api/config');
        } else {
            res.json({
                msg: 'no object named `newconfig` found in body',
            });
        }

    });
}

module.exports = routes;