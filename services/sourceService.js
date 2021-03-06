'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise');
var logic = require('./logic');
var errorService = require('./errorService');

// For testing
var mock = require('./mockParams');

// UPDATE THE DETAILS OF A SOURCE
function updateSource(req, res, next) {
    console.log('Request received to update a source.');
    let source = req.body.source;
    let isIDPresent = true;
    if (isAnySourceParamMissing(source, isIDPresent)) {
        errorService.handleMissingParam('Missing parameters for updating a source', res);
    } else {
        // Check if the source exists
        let checkQuery = `
                SELECT * FROM \`source_basic_information\` 
                WHERE \`source_basic_information\`.\`source_id\` = ?
            `;
        mysql.query(checkQuery, [source.source_id]).then(rows => {
            if (rows[0] == undefined) {
                return Promise.reject({
                    reason: 'The source does not exist.'
                })
            } else {
                // Update the source
                let query = `
                    UPDATE \`source_basic_information\` SET
                    \`parent_id\` = ?, \`stash_id\` = ? ,
                    \`author_id\` = ?, \`title\` = ?,
                    \`xPosition\` = ?, \`yPosition\` = ?,
                    \`type\` = ?, \`hyperlink\` = ?,
                    \`description\` = ?, \`difficulty\` = ?
                    WHERE \`source_basic_information\`.\`source_id\` = ?
                `;
                let inserts = [
                    source.parent_id, source.stash_id,
                    source.author_id, source.title,
                    source.xPosition, source.yPosition,
                    source.type, source.hyperlink,
                    source.description, source.difficulty,
                    source.source_id
                ]
                return mysql.query(query, inserts)
            }
        }).then(rows => {
            res.status(200).send('Source successfully updated');
            console.log('Source successfully updated.\n');
            // Update the tags
            updateTags(source.source_id, source.tags);
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

// UPDATE THE POSITION OF A SOURCE
function updatePosition(req, res, next) {
    console.log('Request received to update a location of a source.');
    let coords = req.body.coords;
    if (coords == null ||
        coords.source_id == null ||
        coords.xPosition == null ||
        coords.yPosition == null
    ) {
        errorService.handleMissingParam(`Some parameters are missing. "source_id", 
        "xPosition" and "yPosition" are needed.`, res);
    }

    let checkQuery = 'SELECT * FROM `source_basic_information` WHERE `source_basic_information`.`source_id` = ?'
    mysql.query(checkQuery, coords.source_id).then(rows => {
        if (rows[0] == undefined) {
            return Promise.reject({
                reason: 'Source with the given id does not exist'
            });
        } else {
            let query = 'UPDATE `source_basic_information` SET `xPosition` = ?, `yPosition` = ? ' +
                'WHERE `source_basic_information`.`source_id` = ?';
            return mysql.query(query, [+coords.xPosition, +coords.yPosition, coords.source_id])
        }
    }).then(rows => {
        console.log('Successfully updated location of source: ' + coords.source_id);
        res.status(200).send('Successfully updated location for source: ' + coords.source_id);
    }).catch(error => {
        if (error.reason) {
            errorService.handleIncorrectParam(error, res);
        } else {
            errorService.handleServerError(error, res);
        }
    })
}

// GET ALL SOURCES FOR A CERTAIN STASH
function getSourcesForStash(req, res, next) {
    console.log('Request received to retrieve sources.');
    let stash_id = req.body.stash_id;

    if (stash_id == null) {
        errorService.handleMissingParam('Missing stash id.', res);
        return;
    }

    let query = 'SELECT * FROM `source_basic_information` WHERE ' +
        '`source_basic_information`.`stash_id` = ?';
    mysql.query(query, stash_id).then(rows => {
        let rawSources = rows;
        res.status(200).send(rawSources);
        console.log(`Sources retrieved for stash with id: ${stash_id}\n`);
    }).catch(error => {
        errorService.handleServerError(error, res);
    });
}

// GET A SPECIFIC SOURCE
function getSource(req, res, next) {
    console.log('Request received to get a specific source.');
    let source_id = req.body.source_id;
    if (source_id == null) {
        errorService.handleMissingParam('Bad request: source_id is missing.', res);
    } else {
        let query = 'SELECT * FROM `source_basic_information` WHERE ' +
            '`source_basic_information`.`source_id` = ? ';
        mysql.query(query, source_id).then(rows => {
            if (rows.length == 1) {
                res.status(200).send(rows[0]);
                console.log('Source retrieval successful.\n');
            } else {
                return Promise.reject({
                    reason: 'The source requested does not exist'
                });
            }
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        })
    }
}

// DELETE A SOURCE
function deleteSource(req, res, next) {
    console.log('Request to delete source received.');

    let source_id = req.body.source_id;

    let childSourceIds = [];
    let parentSourceId = null;

    if (source_id == null) {
        errorService.handleMissingParam('Source ID is missing.', res);
    } else {

        let checkQuery = 'SELECT * FROM `source_basic_information` WHERE ' +
            '`source_basic_information`.`source_id` = ?';
        mysql.query(checkQuery, source_id).then(rows => {
            if (rows[0] != undefined) {
                // The source exist. First store the parent id
                parentSourceId = rows[0].parent_id;

                // Then find all the child sources
                let query = `
                    SELECT * FROM source_basic_information WHERE
                    parent_id = ?
                `;
                return mysql.query(query, [source_id]);
            } else {
                return Promise.reject({
                    reason: 'Source not found.\n'
                })
            }
        }).then(childSources => {
            // Check if there is any child source
            if (childSources.length != 0) {
                // Now update the parent_ids of the child sources
                // First store all the child source ids into an array
                _.each(childSources, source => {
                    childSourceIds.push(source.source_id);
                });
                // Build the update query 
                let query = `UPDATE source_basic_information SET parent_id = ? WHERE `;
                _.each(childSourceIds, id => {
                    query += 'source_id = ? OR ';
                });
                // trime the last 4 characters
                query = query.slice(0, -3);

                // Setup the query parameter
                let queryParams = [];
                queryParams.push(parentSourceId);
                _.each(childSourceIds, id => {
                    queryParams.push(id);
                });

                return mysql.query(query, queryParams);
            } else {
                // No need to swap parent_ids for child sources
                return Promise.resolve(true);
            }
        }).then(() => {
            // Delete it now.
            let query = 'DELETE FROM `source_basic_information` WHERE ' +
                '`source_basic_information`.`source_id`= ?';
            return mysql.query(query, [source_id]);
        }).then(rows => {
            console.log('Source successfully deleted\n');
            res.status(200).send('Source successfully deleted');
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

// CREATE A NEW SOURCE
function createNewSource(req, res, next) {
    console.log('Request received to create a new source.');
    // A new source must have these values:
    let source = req.body.source;
    let isIDPresent = false;

    // Generate a random id
    let id = logic.generateUID();
    source.source_id = id;

    if (isAnySourceParamMissing(source)) {
        errorService.handleMissingParam('Missing parameters for adding a source', res);
    } else {
        // TODO: CHECK IF THE ID ALREADY EXISTS!

        // FOR NOW: just return an error
        let checkQuery = 'SELECT * FROM `source_basic_information` WHERE ' +
            '`source_id` = ?';
        mysql.query(checkQuery, id).then(rows => {
            if (rows.length != 0) {
                return Promise.reject({
                    reason: 'Internal error: unable to add source'
                })
            } else {
                return Promise.resolve();
            }
        }).then(() => {
            // When control reaches here, the id must be unique
            // Add the source to the database
            let query = `
                INSERT INTO \`source_basic_information\` (
                    \`source_id\`, \`parent_id\`, \`stash_id\`, \`author_id\`,
                    \`hyperlink\`, \`title\`, \`description\`, \`type\`, 
                    \`difficulty\`, \`xPosition\`, \`yPosition\`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            let queryParams = [
                id, source.parent_id, source.stash_id, source.author_id,
                source.hyperlink, source.title, source.description, source.type,
                source.difficulty, source.xPosition, source.yPosition
            ];
            return mysql.query(query, queryParams);
        }).then(() => {
            // Send the source object with an id back to 
            res.status(201).send(source);
            console.log('Source creation successful.\n');
            // Update the table of tags
            for (let i = 0; i < source.tags.length; i++) {
                addTag(id, source.tags[i]);
            }
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

// GET THE TAGS FOR A SOURCE
function getAllTags(req, res, next) {
    console.log('Request received to get all tags for a source');
    let source_id = req.body.source_id;
    if (source_id == null) {
        errorService.handleMissingParam('Source ID is missing', res);
    } else {
        // Check if the source exist
        let checkQuery = `
            SELECT * FROM source_basic_information WHERE source_id = ?
        `;
        mysql.query(checkQuery, [source_id]).then(rows => {
            if (rows.length == 0) {
                errorService.handleMissingParam('Source does not exist', res);
            } else {
                // grab all tags that belong to the source
                let query = `
                    SELECT tag FROM tags_list WHERE source_id = ?
                `;
                return mysql.query(query, [source_id])
            }
        }).then(tags => {
            // Re-organize the tags into an array of strings
            let tagsArray = [];
            _.forEach(tags, tag => {
                tagsArray.push(tag.tag);
            });

            res.status(200).send(tagsArray);
            console.log('Successfully retrieved tags.\n');
        }).catch(error => {
            errorService.handleServerError(error, res);
        });
    }
}

/**
 * HELPER FUNCTIONS
 */
// Check if any field in a source object is missing
function isAnySourceParamMissing(source, isIDPresent = false) {
    let isParamMissing = false;

    if (
        source == null ||
        source.parent_id == null ||
        source.stash_id == null ||
        source.author_id == null ||
        source.title == null ||
        source.xPosition == null ||
        source.yPosition == null ||
        source.type == null ||
        source.hyperlink == null ||
        source.description == null ||
        source.difficulty == null ||
        source.tags.length == null
    ) {
        isParamMissing = true;
    }

    // Check for id
    if (isIDPresent) {
        if (source.source_id == null) isParamMissing = true;
    }

    return isParamMissing;
}

// Create a root source
function createRootSource(title, stash_id, author_id, description) {
    let source = {};
    // Populate the source object with the values
    source.source_id = logic.generateUID();
    source.parent_id = '';
    source.stash_id = stash_id;
    source.author_id = author_id;
    source.hyperlink = '';
    source.title = title;
    source.description = description;
    source.type = 'root';
    source.difficulty = '';
    source.xPosition = 0;
    source.yPosition = 0;

    let query = 'INSERT INTO `source_basic_information` ' +
        '(`source_id`, `parent_id`, `stash_id`, `author_id`, `hyperlink`, `title`, `description`, `type`, `difficulty`, `xPosition`, `yPosition`) VALUES ' +
        '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    '\'' + source.sourceid + '\',' +
        '\'' + source.parent_id + '\',' +
        '\'' + source.stash_id + '\',' +
        '\'' + source.author_id + '\',' +
        '\'' + source.hyperlink + '\',' +
        '\'' + source.title + '\',' +
        '\'' + source.description + '\',' +
        '\'' + source.type + '\',' +
        '\'' + source.difficulty + '\',' +
        source.xPosition + ',' +
        source.yPosition +
        ')';
    mysql.query(query, [
        source.source_id, source.parent_id, source.stash_id, source.author_id, source.hyperlink,
        source.title, source.description, source.type, source.difficulty, source.xPosition, source.yPosition
    ]).catch(error => {
        throw error;
    })
}

/**
 * Update the root source of the stash with the given id with the new title
 * 
 * @param {*} stashId - the id of the stash whose root source is to be updated
 * @param {*} newTitle - the new title of the root source
 */
function updateRootSource(stashId, newTitle) {
    let query = `
        UPDATE source_basic_information SET title = ?
        WHERE stash_id = ? AND type = 'root'
    `;
    mysql.query(query, [newTitle, stashId]).then(() => {
        console.log('Updated root source successfully.\n');
    }).catch(error => {
        throw error;
    });
}

// Update the list of tags for the source
// This function assumes that tags is an array
function updateTags(source_id, tags) {
    // Process the tags into a dictionary, with value being the flag of whether 
    // the tag is currently in the database
    let tagDictionary = {};
    for (let i = 0; i < tags.length; i++) {
        let tag = tags[i];
        // initially assume none of the tags existed
        tagDictionary[tag] = false;
    }

    // Retrieve the current list of tags attached to this source
    let query = "SELECT * FROM `tags_list` WHERE `tags_list`.`source_id` = ?";
    mysql.query(query, source_id).then(rows => {
        if (rows[0] == undefined) {
            // no tags existed
            // for this source.Add all of them
            for (let i = 0; i < tags.length; i++) {
                let tag = tags[i];
                let query = `INSERT INTO \`tags_list\` (\`tag\`, \`source_id\`) VALUES (? , ?)`
                mysql.query(query, [tag, source_id]);
            }
        } else {
            // Process the data from the databse to an array of tags only
            let storedTags = [];
            _.each(rows, row => {
                storedTags.push(row.tag)
            });

            // Loop through each tag in the database to see whether the new
            // array of tags already contain it.
            // if not, delete the tag from the database
            _.each(storedTags, tag => {
                let doesExist = false;
                doesExist = _.findKey(tagDictionary, (value, key) => {
                    if (key === tag) return true;
                });
                if (!doesExist) {
                    // now delete the tag from the database
                    let query = `
                            DELETE FROM \`tags_list\` 
                            WHERE \`tags_list\`.\`tag\`= ? 
                            AND \`tags_list\`.\`source_id\`= ?
                        `;
                    mysql.query(query, [tag, source_id]);
                } else {
                    // Set the flag in the tagDictionary
                    tagDictionary[tag] = true;
                }
            })
            // Loop through each tag in the array to see if it is already in the database
            // if not, add that to the database
            _.each(tagDictionary, (isInDatabase, tag) => {
                if (!isInDatabase) {
                    // add to the database
                    let query = "INSERT INTO `tags_list` (`tag`, `source_id`) VALUES (? , ?)";
                    mysql.query(query, [tag, source_id]).catch(error => {
                        throw error;
                    })
                }
            })
        }
    })
}

// Add a tag to the table of tag list
function addTag(source_id, tag) {
    let checkQuery = 'SELECT * FROM `tags_list` WHERE ' +
        '`source_id`= ? AND `tag`= ? ';
    mysql.query(checkQuery, [source_id, tag]).then(rows => {
        if (rows[0] == undefined) {
            // tag does not exist in the source. attempt to update table
            let query = 'INSERT INTO `tags_list` (`tag`, `source_id`) VALUES (?, ?)';
            return mysql.query(query, [tag, source_id])
        }
    }).catch(error => {
        errorService.handleError(error, res);
    })
}

module.exports = {
    createRootSource: createRootSource,
    updateRootSource: updateRootSource,
    createNewSource: createNewSource,
    getSourcesForStash: getSourcesForStash,
    deleteSource: deleteSource,
    updatePosition: updatePosition,
    updateSource: updateSource,
    getSource: getSource,
    getAllTags: getAllTags
}