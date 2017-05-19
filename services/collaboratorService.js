'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysql');
var logic = require('./logic');
var mock = require('./mockParams');

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
        res.status(400).send('Invalid parameters, a stash id and collaborator list is needed.');
        console.log('Update request failed: Invalid parameters.\n')
    } else if (collaborators.length == 0) {
        // Simply remove all entries of collaborators
        // Delete the currently stored list of collabs in the database
        deleteAllCollaborators(stash_id);
    } else {
        // Check if the stash exists
        let checkQuery = `
            SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_id\` LIKE '${stash_id}'
        `;
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows.length == 0) {
                res.status(404).send('The stash does not exist.');
                console.log('Bad request: stash does not exist.\n');
            } else {
                // TODO: IMPROVE THIS
                // Now check if the user exists
                // First process the array of ids into a query string
                let queryString = '';
                _.each(collaborators, user_id => {
                    queryString += `'${user_id}', `;
                });
                queryString = queryString.slice(0, -2);
                console.log(queryString);
                let userQuery = `
                    SELECT * FROM \`user_basic_information\`
                    WHERE \`user_basic_information\`.\`user_id\` IN (${queryString})
                `;
                mysql.query(userQuery, (error, rows) => {
                    if (error) throw error;
                    // Check if the number of users match number of collaborators
                    if (rows.length != collaborators.length) {
                        res.status(400).send('Bad collaborators parameter.');
                        console.log('Update failed: bad collaborators parameter.\n');
                    } else {
                        // Now then update the table of collaborators
                        if (collaborators.length != 0) {
                            checkAndUpdateCollaborators(stash_id, collaborators);
                        }
                        res.status(200).send('Collaborators updated successfully');
                        console.log('Collaborators updated successfully.\n');
                    }
                })
            }
        })
    }
}

function getCollaborators(req, res, next) {
    console.log('Request received to get collaborators for a stash.');
    let stash_id = req.body.stash_id;
    if (stash_id == null) {
        res.status(400).send('Missing stash id.');
        console.log('Retrieval failed: missing stash id.\n');
    } else {
        let checkQuery = `
            SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_basic_information\`.\`stash_id\` = '${stash_id}'
        `;
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows.length == 0) {
                res.status(404).send('Stash does not exist.');
                console.log('Retrieval failed: stash does not exist.\n');
            } else {
                let query = `
                    SELECT * FROM \`collaborators\` WHERE \`stash_id\`='${stash_id}'
                `;
                mysql.query(query, (error, rows) => {
                    let collaboratorList = [];
                    _.each(rows, row => {
                        collaboratorList.push(row.collaborator_id);
                    });
                    res.status(200).send(collaboratorList);
                    console.log('Retrieving collaborators successful.\n');
                });
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
        VALUES ('${stash_id}', '${user_id}')
    `;
    mysql.query(query, (error, rows) => {
        if (error) throw error;
    });
}

function deleteAllCollaborators(stash_id) {
    // Delete the currently stored list of collabs in the database
    let query = `
        DELETE FROM \`collaborators\` 
        WHERE \`collaborators\`.\`stash_id\` = '${stash_id}'
    `;
    mysql.query(query, (error, rows) => {
        if (error) throw error;
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
        WHERE \`collaborators\`.\`stash_id\` = '${stash_id}'
    `;
    mysql.query(query, (error, rows) => {
        if (error) throw error;

        // now add all collaborators to the database
        _.each(collaborators, user_id => {
            addCollaborator(stash_id, user_id);
        })
    });
}

module.exports = {
    updateCollaborator: updateCollaborator,
    getCollaborators: getCollaborators
}