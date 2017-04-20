'use strict';

let mysqlModule = require('mysql');

var mysql = mysqlModule.createConnection({
    // LOCALHOST FOR DEVELOPMENT PURPOSES
    host: "104.199.209.1",
    user: "root",
    password: "sourcestashuq2017",
    database: 'source_stash'
});
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
//   // The connection is terminated gracefully
//   // Ensures all previously enqueued queries are still
//   // before sending a COM_QUIT packet to the MySQL server.
// });