'use strict';

let mysqlModule = require('mysql');

let config;
if (process.env.INSTANCE_CONNECTION_NAME) {
    config = {
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    }
    config.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
    config = {
        host: '104.199.209.1',
        user: 'root',
        password: 'sourcestashuq2017',
        database: 'source_stash'
    }
}

var mysql = mysqlModule.createConnection(config);

mysql.connect(function(err) {
    if (err) {
        console.log('Error connecting to Db');
        throw err;
    }
    console.log('Database connection established');
});

module.exports = mysql;

// mysql.end(function(err) {
//     // The connection is terminated gracefully
//     // Ensures all previously enqueued queries are still
//     // before sending a COM_QUIT packet to the MySQL server.
// });