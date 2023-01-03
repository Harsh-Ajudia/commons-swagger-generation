const { addConsole, ensureFolders } = require('./commons.utils')
const path = require('path')
const fs = require('fs')
let logLevel

const getFolderName = () => {
    let _date = new Date().toLocaleString().split(", ")
    _date[0] = _date[0].split("/").reverse().join("-")
    _date[1] = _date[1].replace(/ |:/g, "_")

    return _date.join("_")
}

module.exports.takeBackup = async (rootDir, options) => {
    try {
        logLevel = options.logLevel
        addConsole(`---------- STARTING BACKUP FOR ${options.backupFiles.serviceName} ----------`, 1)
        const _folder = getFolderName()
        const dest = path.resolve(rootDir, '..', options.backupFiles.serviceName + "_backup", _folder)

        ensureFolders([dest])

        for await (const section of Object.keys(options.fileTypes)) {
            const source = path.resolve(rootDir, 'src', options.fileTypes[section].folder)

            addConsole(`\n\nDoing for folder: ${options.fileTypes[section].folder}\nsource: ${source}\ndest: ${dest}`, 1)

            await copyFolderRecursiveSync(source, dest)
        }
        await removeWaste(dest)

        addConsole("\n\n---------- FINISHING BACKUP ----------\n\n", 1)

    } catch (error) {
        console.log('ERROR TAKING BACKUP', error)
    }
}
const copyFileSync = async (source, target) => {
    let targetFile = target
    // If target is a directory, a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source))
        }
    }
    fs.writeFileSync(targetFile, fs.readFileSync(source))
}

const copyFolderRecursiveSync = async (source, target) => {
    let files = []
    let targetFolder = path.join(target, path.basename(source))

    ensureFolders([targetFolder])

    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source)
        for await (const file of files) {
            addConsole(`file: ${file}`, 2)
            let childSource = path.join(source, file)
            if (fs.lstatSync(childSource).isDirectory()) {
                copyFolderRecursiveSync(childSource, targetFolder)
            } else {
                copyFileSync(childSource, targetFolder)
            }
        }
    }
}

const removeWaste = async (directory) => {
    try {
        const size = await folderSize(directory)
        if (size == 0) {
            fs.rmSync(directory, { recursive: true })
        }
    } catch (error) {
        console.log("ERROR REMOVING WASTE", error)
    }
}

const folderSize = async (folder) => {
    const files = await getFileList(folder)
    let _total = 0

    if (logLevel > 1) {
        console.table(files)
    }
    for await (const filePath of files) {
        _total += fs.statSync(filePath).size
    }
    return _total
}

const getFileList = async (directory, list = []) => {
    const files = fs.readdirSync(directory)

    for await (const file of files) {
        if (fs.statSync(path.resolve(directory, file)).isDirectory()) {
            list = await getFileList(path.resolve(directory, file), list)
        } else {
            list.push(path.resolve(directory, file))
        }
    }
    return list
}