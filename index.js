const express = require('express');
const seed = require("./src/db/db_seed");
const compression = require('compression');
const config = require('./src/utils/config')

const app = express();

app.use(compression());
app.get('/', (req, res) => res.status(200).send('This is only a placeholder'));

var db;

app.route("/seed_sql").get((req, res) => {
    if (!db) {
        seed().then(json_data => {
            db = json_data;
            res.json(db);
        });
    } else {
        console.log(`Sending allready read and parsed data starting with #${start}`);
        res.json(db);
    }
});

const port = process.env.port || config.port;
app.listen(port, () => console.log(`Server listening on port ${port}!`))