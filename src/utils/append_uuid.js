const uuid = require('uuid');

module.exports = (arr) => {
    let out = [];
    arr.forEach(row => {
        out.push([uuid.v4(), ...row]);
    });
    return out;
}