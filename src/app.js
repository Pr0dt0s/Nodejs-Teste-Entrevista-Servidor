const express = require('express');
const seed = require('./db/db_seed');
const compression = require('compression');
const config = require('./utils/config');

const app = express();

app.use(compression());
app.get('/', (req, res) => res.status(200).send('This is only a placeholder'));

app.route("/seed_sql").get((req, res) => {

    console.log(`Atempting to seed the database ...`);

    let seedPromise = seed(req.query.force);
    seedPromise.then(done => {
        console.log(`Seeding is ${done ? '' : 'not '}complete`);
        res.json(done);
    });
});

const port = process.env.port || config.port;
app.listen(port, () => console.log(`Server listening on port ${port}!`));