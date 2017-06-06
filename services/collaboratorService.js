'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise');
var logic = require('./logic');
var mock = require('./mockParams');
var errorService = require('./errorService');

function removeCollaborator(req, res, next) {
    console.log('Request received to remove a collaborator.');
    let collaborator_id = req.body.collaborator_id;
    let stash_id = req.body.stash_id;
    if (collaborator_id == null || stash_id == null) {
        errorService.handleMissingParam('Bad request: collaborator and stash ids are needed', res);
    } else {
        // Check if the stash id is valid
        let checkQuery = `
        SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_basic_information\`.\`stash_id\`= ?
        `
        mysql.query(checkQuery, [stash_id]).then(rows => {
            if (rows.length == 0) {
                return Promise.reject({ reason: 'Removal failed: stash does not exist.\n' });
            } else {
                // Check if the user id is valid
                let userQuery = `
                    SELECT * FROM \`user_basic_information\`
                    WHERE \`user_basic_information\`.\`user_id\`= ?
                `;
                return mysql.query(userQuery, [collaborator_id]);
            }
        }).then(rows => {
            if (rows.length == 0) {
                let reason = 'Removal failed: user does not exist.';
                return Promise.reject({ reason: reason });
            } else {
                let query = "DELETE FROM `collaborators` WHERE`stash_id`= ? AND `collaborator_id`= ?";
                return mysql.query(query, [stash_id, collaborator_id]);
            }
        }).then(rows => {
            // Should be okay now. Delete from collaborators
            let query = "DELETE FROM `collaborators` WHERE `stash_id`= ? AND `collaborator_id` = ?";
            return mysql.query(query, [stash_id, collaborator_id])
        }).then(rows => {
            res.status(200).send('Successfully removed collaborator');
            console.log('Successfully removed collaborator.\n');
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error.reason, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

/**
 * Update a list of collaborators. Params required:
 *      stash_id: string - the id of the stash
 *      collaborators: string[] - the list of user ids
 */
function updateCollaborator(req, res, next) {
    console.log('Request received to add collaborators.');
    let stash_id = req.body.stash_id;
    let collaborators = req.body.collaborators;
    if (
        stash_id === null ||
        collaborators === null ||
        collaborators.length === null
    ) {
        errorService.handleMissingParam('a stash id and collaborator list is needed.', res);
    } else if (collaborators.length == 0) {
        // Simply remove all entries of collaborators
        // Delete the currently stored list of collabs in the database
        deleteAllCollaborators(stash_id);
    } else {
        // Check if the stash exists
        let checkQuery = `
            SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_id\` = ?
        `;
        mysql.query(checkQuery, stash_id).then(rows => {
            if (rows.length == 0) {
                return Promise.reject({ reason: 'The stash does not exist.' })
            } else {
                // TODO: IMPROVE THIS
                // Now check if the user exists
                // First process the array of ids into a query string
                let queryString = '';
                _.each(collaborators, user_id => {
                    queryString += "? ,";
                });
                queryString = queryString.slice(0, -2);
                let userQuery = `
                    SELECT * FROM \`user_basic_information\`
                    WHERE \`user_basic_information\`.\`user_id\` IN (${queryString})
                `;
                return mysql.query(userQuery, collaborators);
            }
        }).then(rows => {
            // Check if the number of users match number of collaborators
            if (rows.length != collaborators.length) {
                return Promise.reject({ reason: 'Bad collaborators parameter' });
            } else {
                // Now then update the table of collaborators
                if (collaborators.length != 0) {
                    checkAndUpdateCollaborators(stash_id, collaborators);
                }
                res.status(200).send('Collaborators updated successfully');
                console.log('Collaborators updated successfully.\n');
            }
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error.reason, res);
            } else {
                errorService.handleServerError(error, res);
            }
        })
    }
}

function getCollaborators(req, res, next) {
    console.log('Request received to get collaborators for a stash.');
    let stash_id = req.body.stash_id;
    if (stash_id == null) {
        errorService.handleMissingParam('Missing stash id.', res);
    } else {
        let checkQuery = `
            SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_basic_information\`.\`stash_id\` = ?
        `;
        mysql.query(checkQuery, stash_id).then(rows => {
            if (rows.length == 0) {
                return Promise.reject({ reason: 'Stash does not exist' })
            } else {
                let query = `
                    SELECT * FROM \`collaborators\` WHERE \`stash_id\`=?
                `;
                return mysql.query(query, stash_id);
            }
        }).then(rows => {
            let collaboratorList = [];
            _.each(rows, row => {
                collaboratorList.push(row.collaborator_id);
            });
            res.status(200).send(collaboratorList);
            console.log('Retrieving collaborators successful.\n');
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error.reason, res);
            } else {
                errorService.handleServerError(error, res);
            }
        })
    }
}
/*******************
 * HELPER FUNCTIONS
 *******************/
// Attempt to add each user id into the table
// Pre-condition: the stash_id and user_id are valid
// Post-condition: the table has at least one entry with stash_id, user_id
function addCollaborator(stash_id, user_id) {
    let query = `
        INSERT INTO \`collaborators\`(\`stash_id\`, \`collaborator_id\`) 
        VALUES (? , ?)
    `;
    mysql.query(query, [stash_id, user_id]).catch(error => {
        throw error;
    });
}

function deleteAllCollaborators(stash_id) {
    // Delete the currently stored list of collabs in the database
    let query = `
        DELETE FROM \`collaborators\` 
        WHERE \`collaborators\`.\`stash_id\` = ?
    `;
    mysql.query(query, stash_id).catch(error => {
        throw (error);
    });
}

function checkAndUpdateCollaborators(stash_id, collaborators) {
    // Process the list of collaborators into a dictionary,
    // with the value being whether the collaborator is in the database
    let dictionary = {};
    _.each(collaborators, user_id => {
        // initially assume none of the collaborators are there
        dictionary[user_id] = false;
    });

    // Delete the currently stored list of collabs in the database
    let query = `
        DELETE FROM \`collaborators\` 
        WHERE \`collaborators\`.\`stash_id\` = ?
    `;
    mysql.query(query, stash_id).then(rows => {
        // now add all collaborators to the database
        _.each(collaborators, user_id => {
            addCollaborator(stash_id, user_id);
        });
    }).catch(error => {
        throw error;
    })
}

module.exports = {
    updateCollaborator: updateCollaborator,
    getCollaborators: getCollaborators,
    removeCollaborator: removeCollaborator
}