let config = {
    //ENV
    port: 3000,
    //MySQL
    hostname: 'localhost',
    mysql_port: '3306',
    username: 'user_test',
    password: 'P@ssw0rd',
    database_name: 'test_db',
    table_name: 'base',
    replace_null: false, //if true replaces null with 0
    omit_null: false,
    updateConfig(newConfig) {
        for (let key in newConfig) {
            if (newConfig.hasOwnProperty(key)) {
                if (this[key]) {
                    this[key] = newConfig[key];
                }
            }
        }
    },
};

module.exports = config;