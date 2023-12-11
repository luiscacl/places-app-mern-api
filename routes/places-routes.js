
const express = require('express');

// Express validator es una libreria que descargamos para validar el contenido mandado de las peticiones post o patch. Al ejecutar check este
// creará un middleware configurado para nuestros requisitos de validacion
const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controller');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();



router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlacesByUserId);

// Cuando el usuario fue autentificado tiene que tener un token válido, por lo que las siguientes peticiones solo se tienen que poder hacer
// si el usuario esta autentificado. Para esto tenemos que agregar un middleware que se ejecute antes de todos los demás middlewares en los
// que queremos que exista un token para poder ser ejecutados cuando se haga una petición
router.use(checkAuth);

// En los argumentos del middleware una vez que ya pusimos la ruta podemos colocar todos los middlewares que queramos, los cuales se ejecutarán
// de izquierda a derecha. Para usar check lo colocamos al principio pero esta vez lo tendremos que ejecutar. Como argumento le pasaremos
// el nombre del campo en el body de nuestra petición que queremos validar. En este caso empezamos con el titulo. Para que termine de funcionar
// tenemmos que usar el validationResult de esta libreria dentro de este middleware en su controller
router.post('/', 
fileUpload.single('image'),
[
    check('title').not().isEmpty(),
    check('description').isLength({min: 5}),
    check('address').not().isEmpty()

], placesControllers.createPlace);

router.patch('/:pid', [
    check('title').not().isEmpty(),
    check('description').isLength({min: 5})
    
], placesControllers.updatePlace);

router.delete('/:pid', placesControllers.deletePlace)

module.exports = router;