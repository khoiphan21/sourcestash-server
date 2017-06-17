let request = {
    body: {
        stash_id: '24039641',
        source_id: '1993942511',
        user_id: '2296818568',
        collaborator_id: '1693158545179',
        collaborators: [
            '1693158545179',
            '185839818004'
        ],
        email: 'john4@example.com',
        // For source
        source: {
            id: 'abcd',
            parent_id: '1947116927',
            stash_id: '24039641',
            author_id: '2296818568',
            hyperlink: 'abcd',
            title: 'INFS3202',
            description: 'description',
            type: 'TEST',
            difficulty: 'TEST DIFFICULTY',
            xPosition: 0,
            yPosition: 0,
            tags: []
        },
        coords: {
            source_id: '0f351ae1-29af-db82-ad8c-15b684731e88',
            xPosition: '100',
            yPosition: '-100'
        }

    }
}
let response = {
    status: function() {
        return {
            send: function(value) {
                console.log('Message sent back: ');
                console.log(value)
            }
        }
    }
};
module.exports = {
    request: request,
    response: response
}