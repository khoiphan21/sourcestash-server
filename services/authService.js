'use strict';

var logic = require('./logic');
var mock = require('./mockParams');
var mysql = require('./mysqlPromise');

getUserID(mock.request, mock.response)

function getUserID(req, res, next) {
    console.log('Request received to get user ID');
    let email = req.body.email;
    if (email == null) {
        res.status(400).send('Email is required.');
        console.log('Retrieval failed: email param is missing.');
        return;
    } else {
        let query = `
            SELECT \`user_id\` FROM \`user_basic_information\` 
            WHERE \`email\`= '${email}'
        `;
        mysql.query(query).then(idArray => {
            if (idArray.length == 0) {
                res.status(404).send('User Email not found.');
                console.log('Retrieval failed: email not found.\n');
            } else {
                let user_id = idArray[0];
                res.status(200).send(user_id);
                console.log('Successfully sent user ID.\n');
            }
        }).catch(error => {
            throw error;
        })
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