'use strict';

/**
 * Hash a string to return a (hopefully) unique id
 */
function hash(string) {
    let h = 0;
    for (let i = 0; i < string.length; i++) {
        h = 3 * h + string.charCodeAt(i)
    }
    return h;
}

module.exports = {
    hash: hash
}