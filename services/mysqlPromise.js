'use strict';

var logic = require('./logic');
var mysql = require('./mysql');

function query(queryString, inserts) {
    if (inserts) {
        return new Promise((resolve, reject) => {
            mysql.query(queryString, inserts, (error, results) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    } else {
        return new Promise((resolve, reject) => {
            mysql.query(queryString, (error, results) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    }

}

function format(query, inserts) {
    return mysql.format(query, inserts);
}

module.exports = {
    query: query,
    format: format
}