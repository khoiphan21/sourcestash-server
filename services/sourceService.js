'use strict';

var mysql = require('./mysql');
var logic = require('./logic');

function createNewSource(req, res, next) {
    // A new source must have these values:
    let source = req.body.source;
    if (
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
        source.tags == null
    ) {
        res.status(400).send('Missing parameters for adding a source');
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
            } else {
                // Source does not exist in the databse, add the source 
                // Calculate the source id
                let sourceId = logic.hash(source.title);
                let query = 'INSERT INTO `source_basic_information` ' +
                    '(`source_id`, `stash_id`, `author_id`, `hyperlink`, `title`, `description`, `type`, `difficulty`, `xPosition`, `yPosition`) VALUES (' +
                    '\'' + sourceId + '\',' +
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
                        console.log('error with insert query in sourceService');
                        throw error;
                    }
                    console.log(rows[0]);

                    res.status(200).send(rows[0]);
                })

                // Update the table of tags

                // Update the table of parent and child source ids
            }
        })
    }

}

module.exports = {
    createNewSource: createNewSource
}