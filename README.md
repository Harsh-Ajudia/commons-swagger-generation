# SWAGGER FILE GENERATION

You must meet the requirements of creating the swagger.json file in order to output the error prone code.

1. Create Swagger file with proper route name
2. Ensure proper HTTP method is set in the route property
3. Code generator will look for the last fragment in the route for a controller function name to put in the generated code
    Eg 1: consider the below path
    /books/v1/**deleteBook**
    from this path the code generator will take **deleteBook** as a function name

    Eg 2: what is your route has a param fragment? like the one below
    /books/v1/**getBook**/{bookId}
    So in this case the code generator will check for the 2nd last fragment which is **getBook**
4. Ensure that if you are defining your own function without the use of code generator it must follow this export syntax
    module.exports.getBooks = () => {}
    As this is the export syntax other functions are considered helper function like the one below
    const sortSomething = () => {}
    So the code generator will append the new methods after your code
5. If you run code generator again it will look inside the contoller for the derived function name and if it finds one it will skip so you don't have to worry about it overwriting your code.



## Use the below syntax for generating static files from swagger definition at swagger.json

## Step 1. Add Script for fast and easy use in package.json file
Add **"generate-swag" :"node generate.js"** the npm script to your package.json.

Assuming you have generate.js file at the root of your project.

```javascript
"scripts": {
    "start": "node index.js",
    "test": "mocha --timeout 60000",
    "coverage": "npx nyc mocha --timeout 60000",
    "generate-swag": "node generate.js"
}
```

## Step 2. Calling the method
Also Create another file called **[generate.js](https://github.com/Harsh-Ajudia/commons-swagger-generation/blob/main/examples/generate.js)** at the root as mentioned above

*Note:* You can call the method anywhere. This is just a showcase of how you can invoke this method
Refer the sample file here [generate.js](https://github.com/Harsh-Ajudia/commons-swagger-generation/blob/main/examples/generate.js) for details.

```javascript
const fileGeneration = require('commons-swagger-generation')

const constants = {
    logLevel: 1,
    methodMapper: {},
    fileTypes: {},
    maxRotations: 3
}

fileGeneration.generateControllers(constants)
/**
 * @@ logLevel:         supported options: 1 or 2. 1 will give basic and 2 will give detailed logs
 * @@ methodMapper:     It is used to map schema files whether to validate query or validate body against UI payload
 * @@ fileTypes:        The filename, template name, folder name that code generator writes comes from this variable
 * @@ maxRotations:     It is used to specify the max rounds for getting the unique possibility of function name inside controller
 */
```
## Step 2. Run the script
The below script will generate/add/update the file based on the swagger routes that is defined in swagger.json

Make sure you have given proper config and folder names as it will oerwrite/append based on the scenario

To avoid unnecessary code loss what you can do is check VS Code git log and confirm the changes
```javascript
npm run generate-swag
```

## Supported files are:
If you are running the command and your let's say your path is as mentioned below:
/books/v1/**getBooks**

The code generator in this case will write the below mentioned file and basic setup code to get you started

- src/controller/getBooks.js
- src/model/getBooks/index.js
- src/model/getBooks/schema/index.json
- src/repositories/getBooks.js
- src/routers/index.js
- src/routers/getBooks.js
- src/services/getBooks.js

## Currently supported methods:
- GET
- POST
- PUT
- PATCH
- DELETE

## Use LogLevel to debug the situation
You can set the logLevel in the config

1. use logLevel = 1 where there is no issue and for most cases. This will take lesser time compared to when the log is more detailed
2. use logLevel = 2 where you need to debug the errors or find out any bug/issue present in this generator

## Support And Issues

If you face any kind of issue **contact me** or can raise an issue for this module