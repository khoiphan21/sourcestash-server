'use strict';

let mysqlModule = require('mysql');

let config = {
    // LOCALHOST FOR DEVELOPMENT PURPOSES
    // host: '104.199.209.1',
    // user: 'root',
    // password: 'sourcestashuq2017',
    // database: 'source_stash'

    // host: "104.199.209.1",
    // SOCKETPATH FOR DEPLOYMENT
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
}

var mysql = mysqlModule.createConnection(config);

mysql.connect(function(err) {
    if (err) {
        console.log('Error connecting to Db');
        throw err;
        return;
    }
    console.log('Database connection established');
});

module.exports = mysql;

// mysql.end(function(err) {
//     // The connection is terminated gracefully
//     // Ensures all previously enqueued queries are still
//     // before sending a COM_QUIT packet to the MySQL server.
// });