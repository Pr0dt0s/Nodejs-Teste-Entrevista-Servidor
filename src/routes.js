const {
    query,
} = require('./db/db');
const seed = require('./db/db_seed');
const config = require('./utils/config');

function routes(app) {

    app.get('/', (req, res) => res.status(200).send('This is only a placeholder'));

    app.route("/seed_sql").get((req, res) => {

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

    app.get('/api/query', (req, res) => {
        res.status(405).json({
            msg: 'You should probably POST a query.',
        });
    });
}

module.exports = routes;