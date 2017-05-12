'use strict';

var logic = require('./logic');

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

module.exports = {
    getUserID: getUserID
}