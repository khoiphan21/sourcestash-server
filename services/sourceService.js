'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysql');
var logic = require('./logic');

/**
 * Update the source_children table, to update the parent of a source
 * @param {*} source_id 
 * @param {*} source_child_id 
 */
function updateParentSource(source_id, source_child_id) {
    let checkQuery = 'SELECT * FROM `source_children` WHERE ' +
        '`source_id`=\'' + source_id + '\' AND `source_child_id`= \'' + source_child_id + '\'';
    mysql.query(checkQuery, (error, rows) => {
        if (error) throw error;
        if (rows[0] == undefined) {
            let query = 'INSERT INTO `source_children` (`source_id`, `source_child_id`) VALUES (' +
                '\'' + source_id + '\', ' +
                '\'' + source_child_id + '\')';
            mysql.query(query, (error, rows) => {
                if (error) throw error;
            })
        }
    });
}

// UPDATE THE DETAILS OF A SOURCE
function updateSource(req, res, next) {
    console.log('Request received to update a source.');
    let source = req.body.source;
    let isIDPresent = true;
    if (isAnySourceParamMissing(source, isIDPresent)) {
        res.status(400).send('Missing parameters for updating a source');
        console.log('Update failed: bad request syntax - one or more parameters are missing.\n')
    } else {
        // Check if the source exists
        let checkQuery = `
                SELECT * FROM \`source_basic_information\` 
                WHERE \`source_basic_information\`.\`source_id\` = "${source.source_id}"
            `;
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                res.status(404).send('The source does not exist.');
                console.log('Update failed: the source does not exist.\n');
            } else {
                // Update the source
                let query = `
                    UPDATE \`source_basic_information\` SET
                    \`parent_id\` = '${source.parent_id}', 
                    \`stash_id\` = '${source.stash_id}', 
                    \`author_id\` = '${source.author_id}', 
                    \`title\` = '${source.title}', 
                    \`xPosition\` = '${source.xPosition}', 
                    \`yPosition\` = '${source.yPosition}' 
                    \`type\` = '${source.type}', 
                    \`hyperlink\` = '${source.hyperlink}', 
                    \`description\` = '${source.description}', 
                    \`difficulty\` = '${source.difficulty}', 
                    WHERE \`source_basic_information\`.\`source_id\` = '${source.source_id}'
                `
                    // Update the tags
                updateTags(source.source_id, source.tags);
            }
        })
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
        console.log('Missing parameters\n');
        res.status(400).send('Some parameters are missing. "source_id", "xPosition" and "yPosition" are needed.');
    }

    let checkQuery = 'SELECT * FROM `source_basic_information` WHERE `source_basic_information`.`source_id` = "' +
        coords.source_id + '"';
    mysql.query(checkQuery, (error, rows) => {
        if (error) throw error;
        if (rows[0] == undefined) {
            // The source with the given id does not exist
            console.log('Source with the given id does not exist \n');
            res.status(400).send('Source with the given id does not exist');
        } else {
            // Update the position
            let query = 'UPDATE `source_basic_information` SET `xPosition` = ' +
                '\'' + coords.xPosition + '\',' + '`yPosition` = ' +
                '\'' + coords.yPosition + '\'' +
                'WHERE `source_basic_information`.`source_id` = \'' + coords.source_id + '\'';
            mysql.query(query, (error, rows) => {
                if (error) throw error;

                console.log('Successfully updated location of source: ' + coords.source_id);
                res.status(200).send('Successfully updated location for source: ' + coords.source_id);
            });
        }
    })
}

// GET ALL SOURCES FOR A CERTAIN STASH
function getSourcesForStash(req, res, next) {
    console.log('Request received to retrieve sources.');
    let stash_id = req.body.stash_id;

    if (stash_id == null) {
        res.status(400).send('Missing stash id parameter');
        return;
    }

    let query = 'SELECT * FROM `source_basic_information` WHERE ' +
        '`source_basic_information`.`stash_id` = "' + stash_id + '"';
    mysql.query(query, (error, rows) => {
        if (error) throw error;
        console.log('Sources retrieved for stash with id: ' + stash_id + '\n');
        res.status(200).send(rows);
    })
}

// DELETE A SOURCE
function deleteSource(req, res, next) {
    console.log('Request to delete source received.');

    let source_id = req.body.source_id;
    if (source_id == null) {
        res.status(400).send('Source ID is misssing');
        return;
    }

    let checkQuery = 'SELECT * FROM `source_basic_information` WHERE ' +
        '`source_basic_information`.`source_id` = "' + source_id + '"';
    mysql.query(checkQuery, (error, rows) => {
        if (error) throw error;
        if (rows[0] != undefined) {
            // The source exist. First swap the parent_id
            let swapQuery = ''
                // Delete it now.
            let query = 'DELETE FROM `source_basic_information` WHERE ' +
                '`source_basic_information`.`source_id`="' + source_id + '"';
            mysql.query(query, (error, rows) => {
                if (error) throw error;

                console.log('Source successfully deleted\n');
                res.status(200).send('Source successfully deleted');
            })
        } else {
            console.log('Source not found.\n');
            res.status(404).send('Source does not exist');
        }
    })
}

// CREATE A NEW SOURCE
function createNewSource(req, res, next) {
    console.log('Request received to create a new source.')
        // A new source must have these values:
    let source = req.body.source;
    let isIDPresent = false;
    if (isAnySourceParamMissing(source)) {
        res.status(400).send('Missing parameters for adding a source');
        console.log('Creation failed: bad request syntax - one or more parameters are missing.\n')
    } else {
        // Check if the source already existed in the database
        let id = logic.hash(source.title);
        let checkQuery = 'SELECT * FROM `source_basic_information` WHERE ' +
            '`source_id` LIKE "' + id + '"';

        mysql.query(checkQuery, (error, rows) => {
            if (error) {
                throw error;
            }
            if (rows[0] != undefined) {
                res.status(400).send('A source with the same title already existed in the stash');
                console.log('Creation failed: a source with the same title already existed.\n')
            } else {
                // Source does not exist in the databse, add the source 
                // Calculate the source id
                let sourceId = logic.hash(source.title);
                let query = 'INSERT INTO `source_basic_information` ' +
                    '(`source_id`, `parent_id`, `stash_id`, `author_id`, `hyperlink`, `title`, `description`, `type`, `difficulty`, `xPosition`, `yPosition`) VALUES (' +
                    '\'' + sourceId + '\',' +
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
                mysql.query(query, (error, rows) => {
                    if (error) {
                        console.log('error with insert query in sourceService');
                        throw error;
                    }

                    // Add the id to the source object
                    source.id = sourceId;
                    res.status(201).send(source);
                    console.log('Source creation successful.\n')
                })

                // Update the table of tags
                for (let i = 0; i < source.tags.length; i++) {
                    addTag(sourceId, source.tags[i]);
                }

            }
        })
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
function createRootSource(title, stash_id, author_id) {
    let source = {};
    // Populate the source object with the values
    source.id = logic.hash(title);
    source.parent_id = '';
    source.stash_id = stash_id;
    source.author_id = author_id;
    source.hyperlink = '';
    source.title = title;
    source.description = '';
    source.type = 'root';
    source.difficulty = '';
    source.xPosition = 0;
    source.yPosition = 0;

    let query = 'INSERT INTO `source_basic_information` ' +
        '(`source_id`, `parent_id`, `stash_id`, `author_id`, `hyperlink`, `title`, `description`, `type`, `difficulty`, `xPosition`, `yPosition`) VALUES (' +
        '\'' + source.id + '\',' +
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
    console.log(query);
    mysql.query(query, (error, rows) => {
        if (error) {
            console.log('error with insert query in createRootSource');
            throw error;
        }
    })
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
    let query = `
        SELECT * FROM \`tags_list\` WHERE \`tags_list\`.\`source_id\` = '${source_id}'
    `;
    mysql.query(query, (error, rows) => {
        if (error) throw error;
        if (rows[0] == undefined) {
            // no tags existed
            // for this source.Add all of them
            for (let i = 0; i < tags.length; i++) {
                let tag = tags[i];
                let query = `
                    INSERT INTO \`tags_list\` (\`tag\`, \`source_id\`) 
                    VALUES ('${tag}', '${source_id}')
                `
                mysql.query(query, (error, rows) => { if (error) throw error; });
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
                            WHERE \`tags_list\`.\`tag\`='${tag}' 
                            AND \`tags_list\`.\`source_id\`='${source_id}'
                        `;
                    mysql.query(query, (error, rows) => { if (error) throw error; });
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
                    let query = `
                        INSERT INTO \`tags_list\` (\`tag\`, \`source_id\`) 
                        VALUES ('${tag}', '${source_id}')
                    `
                    mysql.query(query, (error, rows) => { if (error) throw error; });
                }
            })
        }
    })
}

// Add a tag to the table of tag list
function addTag(source_id, tag) {
    let checkQuery = 'SELECT * FROM `tags_list` WHERE ' +
        '`source_id`=\'' + source_id + '\' AND `tag`=\'' + tag + '\'';
    mysql.query(checkQuery, (error, rows) => {
        if (error) throw error;
        if (rows[0] == undefined) {
            // tag does not exist in the source. attempt to update table
            let query = 'INSERT INTO `tags_list` (`tag`, `source_id`) VALUES (' +
                '\'' + tag + '\', ' +
                '\'' + source_id + '\')';
            mysql.query(query, (error, rows) => {
                if (error) throw error;
            })
        }
    })
}


module.exports = {
    createRootSource: createRootSource,
    createNewSource: createNewSource,
    getSourcesForStash: getSourcesForStash,
    deleteSource: deleteSource,
    updatePosition: updatePosition,
    updateSource: updateSource
}