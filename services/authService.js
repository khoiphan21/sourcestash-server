'use strict';

var logic = require('./logic');
var mock = require('./mockParams');
var mysql = require('./mysqlPromise');
var errorService = require('./errorService');

function getUserID(req, res, next) {
    console.log('Request received to get user ID');
    let email = req.body.email;
    if (email == null) {
        errorService.handleMissingParam('Email is required.', res);
    } else {
        let query = `
            SELECT \`user_id\` FROM \`user_basic_information\` 
            WHERE \`email\`= ?
        `;
        mysql.query(query, email).then(idArray => {
            if (idArray.length == 0) {
                errorService.handleIncorrectParam('User Email not found.', res);
            } else {
                let user_id = idArray[0];
                res.status(200).send(user_id);
                console.log('Successfully sent user ID.\n');
            }
        }).catch(error => {
            errorService.handleServerError(error, res);
        });
    }
}

/**
 * Get the basic info of a user: id, email, firstname, lastname
 */
function getBasicUserInformation(req, res, next) {
    console.log('Request received to get basic user information.');
    let user_id = req.body.user_id;
    if (user_id == null) {
        errorService.handleMissingParam('A user id is required', res);
    } else {
        // Check if the user id exists
        let checkQuery = "SELECT * FROM `user_basic_information` WHERE `user_id`= ?";
        mysql.query(checkQuery, user_id).then(rows => {
            if (rows.length == 0) {
                let reason = 'User does not exist';
                return Promise.reject({ reason: reason });
            } else {
                // Retrieve the basic details and return that 
                let query = `
                        SELECT \`user_id\`, \`email\`, \`firstname\`, \`lastname\` 
                        FROM \`user_basic_information\` WHERE \`user_id\`= ?
                    `;
                return mysql.query(query, user_id);
            }
        }).then(userDataArray => {
            let userData = userDataArray[0];
            res.status(200).send(userData);
            console.log('Retrieval successful.\n');
        }).catch(error => {
            if (error.reason) {
                // Is server recognizable
                errorService.handleIncorrectParam(error.reason, res)
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

module.exports = {
    getUserID: getUserID,
    getBasicUserInformation: getBasicUserInformation
}