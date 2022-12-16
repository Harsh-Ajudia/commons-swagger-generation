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

```javascript
npm run generate-controller
```

## Supported files are:
If you are running the command and your let's say your path is as mentioned below:
/books/v1/**getBooks**

The code generator in this case will write the below mentioned file and basic setup code to get you started

- src/controller/getBooks.js
- src/services/getBooks.js
- src/repositories/getBooks.js
- src/model/getBooks/index.js
- src/model/getBooks/schema/index.json

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