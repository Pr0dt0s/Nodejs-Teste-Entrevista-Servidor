const express = require('express');
const compression = require('compression');
const config = require('./utils/config');
const cors = require('cors');

const app = express();
app.use(compression());
app.use(express.json());
app.use(cors());

require('./routes')(app);

const port = process.env.port || config.port;
app.listen(port, () => console.log(`Server listening on port ${port}!`));