const express = require('express');
const seed = require("./src/db/db_seed");
const compression = require('compression');
const config = require('./src/utils/config')
const { Observable } = require('rxjs');


const app = express();

app.use(compression());
app.get('/', (req, res) => res.status(200).send('This is only a placeholder'));

app.route("/seed_sql").get((req, res) => {
    console.log(`seeding ...`);

    let promises = [new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('timeout reached, responding request');
            resolve(false);
        }, 500);
    }), new Promise((resolve, reject) => {
        resolve(seed());
    })];
    let done = false;
    Promise.race(promises).then(result => done = result);
    if (done) {
        console.log('done seeding')
    }
    res.json(done); 
});

const port = process.env.port || config.port;
app.listen(port, () => console.log(`Server listening on port ${port}!`))