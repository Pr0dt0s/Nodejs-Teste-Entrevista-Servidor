let config = {
    //ENV
    port: 3000,
    filename: './src/db/BASE.xlsx',
    //MySQL
    hostname: 'localhost',
    mysql_port: '3306',
    username: 'user_test',
    password: 'P@ssw0rd',
    database_name: 'test_db',
    table_name: 'base',
    //Excel parsing options
    replace_null: false, //if true replaces null with 0
    omit_null: false,
    updateConfig(newConfig) {
        console.log('Updating configuration');
        let changed = [];
        for (let key in newConfig) {
            if (newConfig.hasOwnProperty(key)) {
                if (this[key]) {
                    this[key] = newConfig[key];
                    changed.push(key);
                }
            }
        }
        console.log(`Changed : ${changed.join(',')}`);
    },
};

module.exports = config;