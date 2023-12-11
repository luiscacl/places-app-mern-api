
const fs = require('fs');
const path = require('path');
const express = require('express');
// Body Parser nos ayuda para post requests
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');

const app = express();

// Primero tenemos que ejecutar el middleware que analizará el body antes de los middlewares que se ejecutan dependiendo de las rutas. Con
// bodyParser analizaremos el body de la petición y con json extraeremos toda la info json convirtiéndola en los tipos de datos 
// correspondientes. Después se ejecutará automáticamente next para que se ejecuten los siguientes middlewares. Al analizar el body
// con esto los demás middlewares tendrán acceso a la info del body en el parámetro req
app.use(bodyParser.json());

// Middleware usado para mostrar paths de imagenes
app.use('/uploads/images', express.static(path.join('uploads', 'images')));

// Para que las peticiones se hagan sin que exista algun error CORS tenemos que agregar información a todos nuestros headers en la respuesta (Este error ocurre
// cuando un dominio hace petición a otro dominio diferente, ya que el backend corre en localhost 5000 y el frontend en localhost 3000)
app.use((req, res, next) => {

    // En el primer argumento colocamos el nombre que queremos agregar en el header, en el segundo argumento tenemos que especificar cuáles 
    // dominios tienen permitido mandar peticiones
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Definimos que tipo de headers pueden ser mandandos como peticiones. NOTA: Al permitir el header authorization podemos mandar tokens
    // en las peticiones para saber si el usuario esta autentificado
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    // Definimos que métodos http pueden ser usados y mandados como peticiones
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

    next();
});

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);

// La idea es que este middleware solo se ejecute si no hemos mandado ninguna respuesta en nuestras rutas anteriores, porque a propósito si
// mandamos una respuesta no llamamos a next, por lo que no se ejecutará este middleware
app.use((req, res, next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
    // Al arrojar el error se ejecutará el error handler middleware function
});

// Al agregar 4 parámetros en el middleware express lo reconocerá como un error handler middleware function (funcion middleware de manejador 
// de errores). Eso significa que esta función solo será ejecutada en peticiones anteriores que tengan un error en él, o en peticiones 
// anteriores que hayan arrojado un error a propósito. En este caso si el middleware anterior arroja un error esta función se ejecutará
app.use((error, req, res, next) => {
    if(req.file) {
        fs.unlink(req.file.path, err => {
            console.log(err);
        });
    }
    // Si la resupesta ha sido mandada
    if(res.headerSent){
        return next(error);
    }
    res.status(error.code || 500); // La propiedad error.code la creamos nosotros
    res.json({message: error.message || 'An unknown error ocurred'});
});


console.log(process.env.DB_USER)
// DATA BASE -------------------------------------------------------------------------------------------------------------------------------
// La lógica de nuestra base de datos (Mongoose) la tenemos que usar al iniciar nuestro backend server
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0zmy5yj.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
.then(() => {
    app.listen(5000);

})
.catch(err => {

});