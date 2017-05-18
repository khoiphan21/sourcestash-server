'use strict';

var logic = require('./logic');
var mock = require('./mockParams');
var mysql = require('./mysqlPromise');

function getUserID(req, res, next) {
    console.log('Request received to get user ID');
    if (req.body.email == null) {
        res.status(400).send('Email is required.');
        console.log('Bad Request');
        return;
    } else {
        console.log(req.body.email);
        let id = logic.hash(req.body.email);
        res.status(200).send({
            userID: id
        });
        console.log('Successfully sent user ID');
    }
}

/**
 * Get the basic info of a user: id, email, firstname, lastname
 */
function getBasicUserInformation(req, res, next) {
    console.log('Request received to get basic user information.');
    let user_id = req.body.user_id;
    if (user_id == null) {
        res.status(400).send('A user id is required');
        console.log('Retrieval failed: missing parameter user_id.\n');
    } else {
        // Check if the user id exists
        let checkQuery = `
            SELECT * FROM \`user_basic_information\` WHERE \`user_id\`='${user_id}'
        `;
        mysql.query(checkQuery)
            .then(rows => {
                if (rows.length == 0) {
                    res.status(404).send('User does not exist.');
                    console.log('Retrieval failed: user does not exist.\n');
                } else {
                    // Retrieve the basic details and return that 
                    let query = `
                    SELECT \`user_id\`, \`email\`, \`firstname\`, \`lastname\` 
                    FROM \`user_basic_information\` WHERE \`user_id\`='${user_id}'
                `;
                    return mysql.query(query);
                }
            })
            .then(userDataArray => {
                let userData = userDataArray[0];
                res.status(200).send(userData);
                console.log('Retrieval successful.\n');
            })
            .catch(error => {
                throw error;
            });
    }
}

module.exports = {
    getUserID: getUserID,
    getBasicUserInformation: getBasicUserInformation
}