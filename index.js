const fs = require('fs')
const path = require('path')
const { _throwError, camelCase, ensureFolders, isValidJson, rewriteControllers, hyphenCase, addConsole, getRouterPath, writeRouter, updateConfig, deReferenceSchema, updateDefinitions } = require('./_helpers/commons.utils')

let basePath = null
let currentDir = null

let fileTypes = null
let methodMapper = null
let logLevel = null

let definitions = {}
module.exports.generateControllers = async (config = null) => {
    const startTime = new Date().getTime()
    fileTypes = config.fileTypes
    logLevel = config.logLevel
    methodMapper = config.methodMapper

    updateConfig(config)
    basePath = process.cwd()
    currentDir = __dirname
    const folders = [
        path.resolve(basePath, "src", fileTypes['controller']['folder']),
        path.resolve(basePath, "src", fileTypes['service']['folder']),
        path.resolve(basePath, "src", fileTypes['repository']['folder']),
        path.resolve(basePath, "src", fileTypes['model']['folder']),
        path.resolve(basePath, "src", fileTypes['router']['folder'])
    ]

    ensureFolders(folders)
    await readSwagger()
    console.info(`Process finished. Time taken ${(new Date().getTime() - startTime) / 1000} s`)
}

const readSwagger = async () => {
    try {
        let apis = []
        const swaggerPath = path.resolve(basePath, 'src', 'swagger', 'swagger.json')
        let swagger = fs.readFileSync(swaggerPath, 'utf-8')
        swagger = JSON.parse(swagger)

        if (swagger.paths) {
            const forceRewrite = true
            if (forceRewrite) {
                swagger = await rewriteControllers(swagger)
            }
            definitions = swagger.definitions
            updateDefinitions(definitions)
            const totalApis = Object.keys(swagger.paths).length
            let currentProgress = 0

            for await (const route of Object.keys(swagger.paths)) {

                addConsole(`\n\nStarting process for ${route}--------------------`)
                const apiData = await convertApi(route, swagger.paths[route])
                apis = apiData ? apis.concat(apiData) : apis
                currentProgress++
                addConsole(`Ending process --------------------------------------- ${currentProgress}/${totalApis} -- ${(currentProgress / totalApis * 100).toFixed(0)}%`)

                if (logLevel <= 1) {
                    let percent = (currentProgress / totalApis * 100).toFixed(0)
                    process.stdout.write(`Processing apis: ${currentProgress}/${totalApis} -- ${percent}%`) // _refresh
                    process.stdout.cursorTo(0)// _refresh
                }
            }

            await writeRouter(apis, basePath, currentDir)

            process.stdout.write("\n\n") // _refresh

            if (logLevel > 1) {
                console.table(apis.sort((a, b) => {
                    return a.folder.localeCompare(b.folder)
                }))
            }
        } else {
            _throwError(`No swagger paths found at: ${swaggerPath}`)
        }

    } catch (error) {
        console.log('SWAGGER ERROR', error)
    }
}

const convertApi = async (route, routeDetails) => {
    try {
        let apis = []
        for await (const _method of Object.keys(routeDetails)) {
            let _controller = routeDetails[_method].tags && routeDetails[_method].tags.length ? routeDetails[_method].tags[0] :
                _throwError(`Invalid controller name found for path: ${route}`)

            _controller = _controller.replace(/-controller/g, "")

            _controller = camelCase(_controller)
            let _functionName = hyphenCase(routeDetails[_method].functionName)
            const writeRes = await writeFiles(_functionName, _controller, _method, route, routeDetails[_method])
            apis = apis.concat(writeRes)
        }
        return apis
    } catch (error) {
        console.log('SWAGGER CONVERSION ERROR', error)
    }
}

const writeFiles = async (_functionName, _controller, _method, route, metaData) => {
    try {
        const apis = []
        for await (const fileType of Object.keys(fileTypes)) {
            const mapper = fileTypes[fileType]
            let __FILE = path.resolve(basePath, "src", mapper.folder, `${_controller + mapper.fileName}`)

            if (fileType == 'model') {
                const folderPath = path.resolve(basePath, 'src', mapper.folder, _controller)
                const folderSchemaPath = path.resolve(basePath, 'src', mapper.folder, _controller, 'schema')
                ensureFolders([folderPath, folderSchemaPath])
                __FILE = path.resolve(basePath, "src", mapper.folder, _controller, `${'index' + mapper.fileName}`)
            }
            if (fileType == 'schema') {
                __FILE = path.resolve(basePath, "src", mapper.folder, _controller, 'schema', `${'index' + mapper.fileName}`)
            }
            if (fileType == 'router') {
                __FILE = path.resolve(basePath, "src", mapper.folder, `${_controller + mapper.fileName}`)
            }


            if (!fs.existsSync(__FILE)) {
                addConsole(`File not found, so creating file at ${__FILE}`)
                fs.closeSync(fs.openSync(__FILE, 'a'))
            }

            var fileStats = fs.statSync(__FILE)
            let rawData = fs.readFileSync(path.resolve(currentDir, '_helpers', 'files', mapper.template), 'utf-8')

            let routerString = fs.readFileSync(path.resolve(currentDir, '_helpers', 'files', 'router.imports.file'), 'utf-8')
            const serviceString = `const ${_controller}Service = require('../${fileTypes['service']['folder']}/${_controller}')\n\n`
            const crudString = `const { crud } = require('commons-mongodb-crud')\n\n`
            const repositoryString = `const ${_controller}Repository = require('../${fileTypes['repository']['folder']}/${_controller}')\n\n`
            const modelString = fs.readFileSync(path.resolve(currentDir, '_helpers', 'files', 'model.imports.file'), 'utf-8')

            switch (fileType) {
                case "controller":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    const comments = `/*\n* @@method : ${_method.toUpperCase()}\n* @@api    : ${metaData.summary} \n*/`
                    rawData = rawData.replace(/_CONTROLLER_COMMENTS_/g, comments)
                    rawData = rawData.replace(/_SERVICE_NAME/g, _controller + 'Service')
                    break;
                case "service":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    break;
                case "repository":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    break;
                case "model":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    const paramType = methodMapper[_method] ? methodMapper[_method] : 'body'
                    rawData = rawData.replace(/_PARAMETER_NAME_/g, paramType)
                    break;
                case "schema":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    break;
                case "router":
                    rawData = rawData.replace(/_FUNCTION_NAME/g, _functionName)
                    rawData = rawData.replace(/_SERVICE_NAME/g, _controller)
                    rawData = rawData.replace(/_METHOD_NAME/g, _method)
                    rawData = rawData.replace(/_ROUTER_PATH_NAME/g, getRouterPath(route))
                    rawData = rawData.replace(/_SCHEMA_NAME/g, _controller + 'Schema')

                    routerString = routerString.replace(/_SCHEMA_NAME/g, _controller + 'Schema')
                    routerString = routerString.replace(/_SERVICE_NAME/g, _controller)
                    routerString = routerString.replace(/_FUNCTION_NAME/g, _controller)
                    routerString = routerString.replace(/_CONTROLLER_FOLDER_NAME/g, fileTypes['controller'].folder)
                    routerString = routerString.replace(/_MODEL_FOLDER_NAME/g, fileTypes['model'].folder)

                    break;
                default:
                    break;
            }

            let _writeType = "Skipped"
            const exportsLine = "\nmodule.exports = router"

            if (fileStats.size > 0) {
                // Append
                const existingData = fs.readFileSync(__FILE, 'utf-8')
                if (fileType == 'schema' && isValidJson(rawData) && isValidJson(existingData)) {
                    const deSchema = await deReferenceSchema(route, _method, metaData)
                    let _jsonSchema = JSON.parse(existingData)
                    let _rawData = JSON.parse(rawData)

                    const checkExist = _jsonSchema.find(validation => {
                        return validation.id == _rawData[0].id
                    })
                    _rawData[0].properties = deSchema.properties
                    _rawData[0].required = deSchema.required
                    if (!checkExist) {
                        _jsonSchema = _jsonSchema.concat(_rawData)
                        const jsonToWrite = JSON.stringify(_jsonSchema, null, 4)
                        if (isValidJson(jsonToWrite)) {
                            fs.writeFileSync(__FILE, jsonToWrite)
                            _writeType = "Append"
                        }
                    } else {
                        addConsole(`Schema Definition already present so skipping: ${_functionName}`)
                    }
                }
                if (fileType != 'schema') {
                    if (fileType != 'router' && !existingData.includes("module.exports." + _functionName)) {
                        const data = "\n\n" + rawData
                        fs.appendFileSync(__FILE, data)
                        _writeType = "Append"
                    } else if (fileType == 'router' && !existingData.includes(`router.${_method}('${getRouterPath(route)}'`)) {
                        const exportPos = existingData.indexOf(exportsLine)
                        let oldData = existingData.substring(exportPos)
                        let file = fs.openSync(__FILE, 'r+')
                        const seperator = rawData.length ? "\n\n" : "\n"
                        let bufferedText = new Buffer.from(rawData + seperator + oldData.replace(/^\n|\n$/g, ""))
                        fs.writeSync(file, bufferedText, 0, bufferedText.length, exportPos)
                        fs.closeSync(file)
                        _writeType = "Append"
                    }
                    else {
                        addConsole(`Function already present so skipping: ${_functionName}`)
                    }
                }
            } else {
                // Overwrite
                let data = rawData
                switch (fileType) {
                    case "controller":
                        data = serviceString + data
                        break;
                    case "service":
                        data = repositoryString + data
                        break;
                    case "repository":
                        data = crudString + data
                        break;
                    case "model":
                        data = modelString + data
                        break;
                    case "router":
                        data = routerString + "\n\n" + data + "\n" + exportsLine
                        break;
                    case "schema":
                        const deSchema = await deReferenceSchema(route, _method, metaData)
                        let _rawData = JSON.parse(rawData)

                        _rawData[0].properties = deSchema.properties
                        _rawData[0].required = deSchema.required
                        
                        data = JSON.stringify(_rawData, null, 4)
                        break;
                    default:
                        break;
                }

                fs.writeFileSync(__FILE, data)
                _writeType = "Written"
            }

            apis.push({
                method: _method.toUpperCase(),
                folder: mapper.folder,
                controller: _controller,
                function: _functionName,
                writeType: _writeType
            })
        }
        return apis

    } catch (error) {
        console.log("WRITE FILE ERROR", error)
    }
}