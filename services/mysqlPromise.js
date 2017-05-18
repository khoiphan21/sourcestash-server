'use strict';

var logic = require('./logic');
var mysql = require('./mysql');

function query(queryString) {
    return new Promise((resolve, reject) => {
        mysql.query(queryString, (error, results) => {
            if (error) reject(error);
            resolve(results);
        })
    })
}

module.exports = {
    query: query
}