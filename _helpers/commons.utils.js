const fs = require('fs')
const path = require('path')

let fileTypes = null
let methodMapper = null
let logLevel = null
let maxRotations = null
let definitions = null

module.exports.updateConfig = (config) => {
    fileTypes = config.fileTypes
    logLevel = config.logLevel
    methodMapper = config.methodMapper
    maxRotations = config.maxRotations
}

module.exports._throwError = (message) => {
    throw new Error(message)
}

module.exports.camelCase = (string) => {
    try {
        return string.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => {
            return chr.toUpperCase()
        })

    } catch (error) {
        throw new Error(`Error while converting to camelcase. String: ${string}`)
    }
}

module.exports.ensureFolders = (folders) => {
    try {
        folders.forEach(folder => {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true })
            }
        })
    } catch (error) {
        console.log('Error while creating parent folders', error)
    }
}

module.exports.getFunctionName = (route, count = 0) => {
    try {
        let variables = route.split("/").reverse()
        let _name = ""
        let tries = 0
        // this.addConsole('\n\n\n')
        // this.addConsole('variables', variables, count)
        for (let possibility of variables) {

            if (possibility[0] && possibility[0].match(/[a-z]/i)) {
                _name = _name != "" ? possibility + "-" + _name : possibility
                if (count == tries) {
                    break
                }
                tries++
            }
        }
        return _name
    } catch (error) {
        console.log("GET FUNCTION NAME PARSE", error)
    }
}

module.exports.isValidJson = (_str) => {
    try {
        JSON.parse(_str)
    } catch (error) {
        console.log('INVALID JSON STRING: ', error)
        return false
    }
    return true
}

module.exports.rewriteControllers = async (swagger) => {
    try {
        return await getCleansed(swagger)
    } catch (error) {
        console.log('ERROR REWRITTING SWAGGER', error)
    }
}

const getCleansed = async (swagger) => {
    try {
        let maxRotation = maxRotations
        let reWriteWithMethod = false
        let currentIteration = 1
        let functionList = []
        while (currentIteration <= maxRotation) {
            functionList = []

            for await (const route of Object.keys(swagger.paths)) {
                let _methods = Object.keys(swagger.paths[route])

                _methods.forEach((method) => {
                    let controller = swagger.paths[route][method].tags && swagger.paths[route][method].tags[0] ? swagger.paths[route][method].tags[0] : null
                    // method = method[0] ? method[0] : null
                    if (method && controller) {
                        let fnName = swagger.paths[route][method]['functionName'] ? swagger.paths[route][method]['functionName'] : this.getFunctionName(route)
                        swagger.paths[route][method]['functionName'] = fnName
                        const findDup = functionList.find(elem => elem.controller == controller && elem.function == fnName)

                        if (findDup) {
                            fnName = this.getFunctionName(route, currentIteration)
                            swagger.paths[route][method]['functionName'] = reWriteWithMethod ? `${method}-${fnName}` : fnName

                            if (reWriteWithMethod) {
                                const sameMethod = functionList.find(e => e.controller == controller && e.function == swagger.paths[route][method]['functionName'] && e.method == method)
                                if (sameMethod && route.includes("{") && route.includes("}")) {
                                    swagger.paths[route][method]['functionName'] = swagger.paths[route][method]['functionName'] + 'ByParam'
                                }
                            }
                        }

                        functionList.push({
                            route,
                            method,
                            controller,
                            function: swagger.paths[route][method]['functionName']
                        })
                    }
                });
            }
            const totalDup = await checkDuplicate(functionList)
            this.addConsole(`${totalDup} dup found`)

            if (reWriteWithMethod) {
                break
            }
            if (currentIteration == maxRotation && totalDup != 0) {
                this.addConsole('Rewriting with the methodname', 2)
                reWriteWithMethod = true
                currentIteration--
            }
            if (totalDup == 0) {
                break
            }
            currentIteration++

        }
        return swagger
    } catch (error) {
        console.log('ERROR IN CLEANSING SWAGGER', error)
    }
}

const checkDuplicate = async (list) => {
    let dupCount = 0
    list.forEach(elem => {
        const count = list.filter(search => search.function == elem.function && search.controller == elem.controller)
        if (count.length > 1) {
            dupCount++
        }
    })
    return dupCount
}

module.exports.hyphenCase = (text) => {
    try {
        const camelCase = text.split("-").map(elem => elem.charAt(0).toUpperCase() + elem.slice('1')).join("")
        return camelCase.charAt(0).toLowerCase() + camelCase.slice('1')
    } catch (error) {
        console.log("HYPHEN CASE ERROR", error)
    }
}

module.exports.addConsole = (data, level = 2) => {
    if (level <= logLevel) {
        console.log(data)
    }
}

module.exports.getRouterPath = (routePath) => {
    try {
        const replacements = { "{": ":", "}": "" }
        return routePath.replace(/[{}]/g, map => replacements[map])
    } catch (error) {
        console.log('ERROR GETTING ROUTER PATH', error)
    }
}

module.exports.writeRouter = async (apis, basePath, currentDir) => {
    try {
        const controllers = {}
        const controllerFolder = fileTypes['controller'].folder || "_controllers"
        const routerFolder = fileTypes['router'].folder || "_routers"
        const exportsLine = "\nmodule.exports = router"

        apis.forEach(api => {
            if (api.folder == controllerFolder && controllers[api.folder] == undefined) {
                controllers[api.controller] = 1
            }
        })

        const _indexFile = path.resolve(basePath, 'src', routerFolder, 'index.js')
        if (!fs.existsSync(_indexFile)) {
            fs.closeSync(fs.openSync(_indexFile, 'a'))
        }
        let fileStats = fs.statSync(_indexFile)
        const existingData = fs.readFileSync(_indexFile, 'utf-8')
        const exportPos = existingData.indexOf(exportsLine)

        const _routerImports = fs.readFileSync(path.resolve(currentDir, '_helpers', 'files', 'router.index.imports.file'), 'utf-8')
        const _routerContent = fs.readFileSync(path.resolve(currentDir, '_helpers', 'files', 'router.index.content.file'), 'utf-8')

        let rawData = ""
        for await (const controller of Object.keys(controllers)) {
            let str = _routerContent.replace(/_ROUTER_NAME/g, controller + "Router").replace(/_CONTROLLER_NAME/g, controller)
            const search = str.split('require')[0].trim()

            if (!existingData.includes(search)) {
                this.addConsole('Appending router content as it is not there', 2)
                rawData += "\n\n" + str
            } else {
                this.addConsole(`Skipping router of: ${controller}`, 2)
            }
        }
        if (fileStats.size > 0) {
            // append
            let oldData = existingData.substring(exportPos)
            let file = fs.openSync(_indexFile, 'r+')
            const seperator = rawData.length ? "\n\n" : "\n"
            let bufferedText = new Buffer.from(rawData + seperator + oldData.replace(/^\n|\n$/g, ""))
            fs.writeSync(file, bufferedText, 0, bufferedText.length, exportPos)
            fs.closeSync(file)

        } else {
            // new & overwrite
            fs.writeFileSync(_indexFile, _routerImports + rawData + "\n" + exportsLine)
        }


    } catch (error) {
        console.log("ERROR WHILE WRITING ROUTER", error)
    }
}

module.exports.getStrFromLength = (number) => {
    return `[${"".padStart(number, "=")}]`
}

module.exports.updateDefinitions = (defs) => {
    definitions = defs
}

module.exports.deReferenceSchema = async (route, method, details) => {
    try {
        // console.log(details.parameters)
        let schema = {
            properties: {},
            required: [],
        }
        if (details.parameters && details.parameters.length) {
            for await (const prop of details.parameters) {
                if (prop.in && prop.name) {
                    // console.log('prop', prop)
                    switch (prop.in) {
                        case "query":
                            let childQuery = await generatePostSchema(prop)
                            delete childQuery.description
                            delete childQuery.example
                            schema['properties'][prop.name] = childQuery
                            break;
                        case "path":
                            let childPath = await generatePostSchema(prop)
                            delete childPath.description
                            delete childPath.example
                            schema['properties'][prop.name] = childPath
                            break;
                        case "body":
                            if (prop.schema && prop.schema["$ref"]) {
                                const reference = getDefinition(prop.schema["$ref"])
                                const child = await generatePostSchema(reference)
                                schema = child
                            }
                            break;

                        default:
                            break;
                    }
                }
            }
        }
        return schema
    } catch (error) {
        console.log('SCHEMA DEREFERENCE ERROR', error)
    }
}
const generatePostSchema = async (schema) => {
    try {
        let builder = {}
        if (schema && schema['type'] && ['object', 'array'].includes(schema['type'])) {

            let iterable = {}
            if (schema['type'] == 'array') {
                iterable = schema.items && schema.items.properties ? schema.items.properties : {}
                if (Object.keys(iterable).length === 0 && schema.items && schema.items["$ref"]) {
                    // assuming it might have ref
                    iterable = getDefinition(schema.items["$ref"])
                    iterable = iterable.properties ? iterable.properties : iterable
                } else if (Object.keys(iterable).length === 0 && schema.items) {
                    return schema.items
                }
            } else if (schema['type'] == 'object') {
                iterable = schema.properties ? schema.properties : {}
            }

            for await (const prop of Object.keys(iterable)) {
                if (iterable[prop]["$ref"]) {
                    const childRef = getDefinition(iterable[prop]["$ref"])
                    const childSchema = await generatePostSchema(childRef)
                    builder[prop] = {
                        type: schema['type'],
                        ...childSchema
                    }
                } else if (['object', 'array'].includes(iterable[prop]['type'])) {
                    const childSchema = await generatePostSchema(iterable[prop])
                    // type: iterable[prop]['type'],
                    builder[prop] = {
                        ...iterable[prop],
                        ...childSchema
                    }
                    if (iterable[prop]['type'] == 'array') {
                        builder[prop] = {
                            ...iterable[prop],
                            items: childSchema
                        }
                    }
                }
                else {
                    builder[prop] = {
                        ...iterable[prop]
                    }
                }
                delete builder[prop].description
                delete builder[prop].example
            }


        }
        const buildedSchema = Object.keys(builder).length === 0 ? schema : {
            properties: builder,
        }
        if (schema && schema.required) {
            buildedSchema.required = schema.required
        }
        return buildedSchema
    } catch (error) {
        console.log('GENERATING POST SCHEMA', error)
    }
}
const getDefinition = (path) => {
    try {
        const frags = path.split("/")
        let definitionInstance = definitions
        frags.forEach(element => {
            if (!["#", "definitions"].includes(element)) {
                definitionInstance = definitionInstance[element]
            }
        })
        return definitionInstance

    } catch (error) {
        console.log('GETTING DEF ERROR REFERENCE', error)
    }
}