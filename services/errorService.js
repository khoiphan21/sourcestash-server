'use strict';

function handleError(error, response) {
    if (error.reason) {
        // Predicted error
        response.status(400).send(error.reason);
        console.log(`${error.reason}\n`);
    } else {
        // Internal error, maybe SQL injection
        response.status(500).send('Unknown Server Error');
        throw error;
    }
}

function handleMissingParamError(reason, response) {
    response.status(400).send(reason);
    console.log(`${reason}\n`);
}

module.exports = {
    handleError: handleError,
    handleMissingParamError: handleMissingParamError
}