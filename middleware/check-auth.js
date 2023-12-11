
const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
    // 
    if(req.method === 'OPTIONS'){
        return next();
    }

    // Tenemos que verificar si tenemos un token y este es válido. Para esto vamos a mandar el token en el header de nuestra petición. Aquí
    // en vez de obtener como valor Authorization: 'TOKEN', tendremos Authorization: 'Bearer TOKEN', por lo que tenemos que eliminar del 
    // string bearer para solo tener el valor del token
    try {
        // Escenario 1: Si el header no tiene definido la propiedad authorization se ejecuta catch
        // Escenario 2: Si el header si tiene definido la propiedad authorization pero el valor que contiene no es el token correcto
        const token = req.headers.authorization.split(' ')[1];
        if(!token) {
            throw new Error('Authentication failed');
        }

        // jsonwebtoken fue la libreria que usamos para crear el token, ahora para verificarlo tenemos que usar un método de la misma librería
        // A este método le pasamos nuestro token y la private key específica. El método retornará la info que pusimos dentro del token. Si 
        // este falla retornará un error, por lo que se ejecutará catch
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);

        // En este punto sabemos que el usuario está autentificado, por lo que agregamos a nuestro objeto request la propiedad userData con 
        // el valor de userId. Por último llamamos a next para permitir que los siguientes middlewares ahora si puedan se ejecutados
        req.userData = { userId: decodedToken.userId };
        next();

    } catch (err) {
        const error = new HttpError('Authentication failed', 403);
        return next(error);
    }
}