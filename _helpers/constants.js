module.exports = {
    logLevel: 1,
    methodMapper: {
        get: 'query',
        post: 'body'
    },
    fileMapper: {
        'router': {
            folder: '_routers',
            template: 'router.file',
            fileName: '.js'
        },
        'controller': {
            folder: '_controllers',
            template: 'controller.file',
            fileName: '.js'
        },
        'service': {
            folder: '_services',
            template: 'service.file',
            fileName: '.js'
        },
        'repository': {
            folder: '_repositories',
            template: 'repositories.file',
            fileName: '.js'
        },
        'model': {
            folder: '_model',
            template: 'model.file',
            fileName: '.js'
        },
        'schema': {
            folder: '_model',
            template: 'schema.file',
            fileName: '.json'
        }
    },
    maxRotations: 3
}

