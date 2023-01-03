const fileGeneration = require('commons-swagger-generation')

const options = {
    logLevel: 1,
    methodMapper: {
        get: 'query',
        post: 'body'
    },
    fileTypes: {
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
    maxRotations: 3,
    backupFiles: {
        enable: false,
        serviceName: "node_template"
    }
}

fileGeneration.generateControllers(options)

/**
 * @@ logLevel:         supported options: 1 or 2. 1 will give basic and 2 will give detailed logs
 *
 * @@ methodMapper:     It is used to map schema files whether to validate query or validate body against UI payload
 *
 * @@ fileTypes:        The filename, template name, folder name that code generator writes comes from this variable
 *
 * @@ maxRotations:     It is used to specify the max rounds for getting the unique possibility of function name inside controller
 *
 * @@ backupFiles:      If enable flag is true, will do a backup of all folders at the following path: ../<serviceName>_backup
 */