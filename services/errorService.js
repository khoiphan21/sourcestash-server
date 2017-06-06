'use strict';

function handleServerError(error, response) {
    // Internal error, maybe SQL injection
    response.status(500).send('Unknown Server Error');
    throw error;
}

function handleMissingParam(reason, response) {
    response.status(400).send(reason);
    console.log(`${reason}\n`);
}

function handleIncorrectParam(reason, response) {
    response.status(400).send(reason);
    console.log(`${reason}\n`);
}

function handleResourceNotFound(reason, response) {
    response.status(404).send(reason);
    console.log(`${reason}\n`);
}

module.exports = {
    handleServerError: handleServerError,
    handleMissingParam: handleMissingParam,
    handleIncorrectParam: handleIncorrectParam,
    handleResourceNotFound: handleResourceNotFound
}