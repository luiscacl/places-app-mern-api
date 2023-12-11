
const fs = require('fs');
const uuid = require('uuid').v4;
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// La idea de los controllers es tener todas las funciones middleware que son ejecutadas por ciertas rutas. Así se tiene una mejor organizacion
const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');

let DUMMY_PLACES = [
    {
        id: 'p1',
        title: 'Empire State Building',
        description: 'One of the most famous sky scrapers in the world',
        location: {
            lat: 40.7484474,
            lng: -73.9871516
        },
        address: '20 W 34th St, New York, NY 10001',
        creator: 'u1'
    }
];

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid; // { pid: 'valueEntered' }
    // const place = DUMMY_PLACES.find(p => {
    //     return p.id === placeId;
    // });

    // Ahora con mongoose para encontrar el placebyid utilizaremos un método del constructor. Al igual que habíamos usado find para obtener
    // los datos de la base de datos, también tenemos el método findById para obtener datos con base a un id. Este retorna una promesa, por
    // lo que el middleware lo convertimos en función asincrona
    let place;
    try {
        place = await Place.findById(placeId);

    } catch(err){
        const error = new HttpError('Something went wrong, could not find place', 500);
        return next(error);
    }

    // Error handling
    // if(!place){
    //     res.status(404).json({ message: 'Could not find a place for the provided id' });
    //     return;
    // }

    // Esta sería otra forma se hacer exactamente lo mismo que el código de arriba
    // if(!place){
    //     const error = new Error('Could not find a place for the provided id');
    //     error.code = 404; // Agregamos la propiedad code a error. Al arrojar el error ejecutaríamos el middleware que se encarga de los errores

    //     throw error;
    // }

    // Esta sería lo mismo de arriba pero con menos código creando nuestra propia clase
    if(!place){
        const error = new HttpError('Could not find a place for the provided id', 404);
        return next(error);
    }

    // Al trabajar con mongoose place se convirtió en un tipo de objeto especial de mongoose con sus propios métodos. Para convertir este
    // objeto a un objeto js usamos el método toObject. Ahora como recordamos mongoose asigno por defecto un id propio a cada place, aunque
    // la propiedad del id se asigno en el objeto como _id: el id, para eliminar el guion bajo _ de la propiedad le pasamos como argumento a
    // toObject un objeto como getters: true.
    res.json({ place: place.toObject({ getters: true }) });
}

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid; // { uid: 'valueEntered' }
    // const places = DUMMY_PLACES.filter(p => {
    //     return p.creator === userId;
    // });

    let places;
    try {
        // Habíamos usado el método find del constructor para objeter todos los datos de la base de datos. Si queremos retornar solo los datos
        // específicos (en este caso basándonos en nuestro user id) tenemos que pasarle como argumento a find un objeto con la propiedad
        // que deseamos buscar y este tiene que tener el valor exacto de lo que queremos encontrar. En este caso ya tenemos el userId, por lo
        // que se lo pasamos como valor. Places retorna un array
        places = await Place.find({ creator: userId });

    } catch(err){
        const error = new HttpError('Fetching places failed, please try later', 500);
        return next(error);
    }

    // if(!place){
    //     return res.status(404).json({ message: 'Could not find a place for the provided user id' });
    // }

    // Esta sería otra forma se hacer exactamente lo mismo que el código de arriba
    if(!places /*|| places.length === 0*/){
        // Agregamos la propiedad code a error. Al arrojar el error ejecutaríamos el middleware que se encarga de los errores, pero esta vez
        // en vez de utilizar throw utilizamos next pasandole como argumento el error
        next(        
            new HttpError('Could not find places for the provided user id', 404)
        );
        return;
    }
    
    // Como find retorna un array tenemos que iterar sobre el para luego convertir el objeto mongoose a un objeto normal js
    res.json({ places: places.map(place => place.toObject({ getters: true })) });
}

const createPlace = async (req, res, next) => {
    // Esta funcion es parte de la libreria que instalamos. En caso de que no cumpla la validación que le pedimos cuando usamos check en la
    // parte de routes este nos retornará todos los errores que hubo.
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors);
        throw new HttpError('Invalid inputs passed, please check your data', 422);
    }

    // Para acceder al body de la petición tenemos req.body
    const { title, description, coordinates, address } = req.body;

    // const createdPlace = {
    //     id: uuid(),
    //     title,
    //     description,
    //     location: coordinates,
    //     address,
    //     creator
    // }

    // Ahora en vez de crear un place utilizamos la lógica de mongoose, instanciando un objeto pasandoles como argumento las propiedades
    // que tiene que tener
    const createdPlace = new Place({
        title,
        description,
        // location: coordinates,
        address,
        image: req.file.path,
        // Como establecimos conexión de nuestros places con el user en el modelo al usar type: mongoose.Types.ObjectId
        creator: req.userData.userId
    });

    let user;

    try {
        // Con esto accedemos a la propiedad creator de nuestros users y vemos si el id de nuestro user esta guardado o existe
        user = await User.findById(req.userData.userId);
    } catch (err) {
        const error = new HttpError('Created place failed, please try again', 500);
        return next(error);
    }

    if(!user){
        const error = new HttpError('Could not find user for the provided id', 404);
        return next(error);
    }

    // DUMMY_PLACES.push(createdPlace);

    // Ahora para guardarlo en la base de datos usamos el metodo save, el cual retorna una promesa, por lo que se tiene que usar await y
    // error handling
    try {
        // await createdPlace.save();

        // Ahora con la lógica anterior ya no es suficiente solo usar el método save. Ahora lo mejor es ejecutar diferentes operaciones las
        // cuales no tienen relación la una con la otra. Si alguna de estas operaciones falla tenemos que asegurarnos de arrojar el error. Para
        // esto se usan transactions y sessions. Las transactions nos permiten crear múltiples operaciones aisladas la una de la otra, estas
        // transactions están dentro de sessions, así que para trabajar con las transactions primero tenemos que iniciar una session

        const sess = await mongoose.startSession(); 
        sess.startTransaction();

        // Al mandar los datos a mongo db en save colocamos como argumento un objeto con la propiedad session y el valor de nuestra session
        // creada
        await createdPlace.save({ session: sess });

        // Para que el place id sea añadido a nuestro user accedemos a la propiedad places de users y usamos el método push. Este método es
        // diferente al push de js, este es un método usado por mongoose el cual establece la conección de los dos modelos tomando el id del
        // createdPlace y añadiendolo a la propiedad place del user
        user.places.push(createdPlace);

        // Este user tiene que ser parte de nuestra session, además de guardarlo en mongo db
        await user.save({ session: sess });

        // Si nada del código anterior arroja un error entonces todo esto se guardará en la base de datos y se cerrará la session
        await sess.commitTransaction();

        // Anteriormente las collections se creaban automáticamente al mandar info a la base de datos, PERO cuando se usan transactions
        // tenemos que crear la collection manualmente con el nombre adecuado. Este nombre tiene que tener relacion con el nombre de la ruta

    } catch (err){
        const error = new HttpError('Created place failed, please try again', 500);
        console.log(err)
        return next(error);
    }

    res.status(201);
    // Retornamos en json el createdPlace
    res.json({ place: createdPlace });
}

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid inputs passed, please check your data', 422));
    }

    // Cuando se hacen peticiones patch tambien vienen con un body
    const { title, description } = req.body;

    const placeId = req.params.pid; // { pid: 'valueEntered' }
    // const updatedPlace = { ...DUMMY_PLACES.find(p => p.id === placeId)};
    // const placeIndex = DUMMY_PLACES.findIndex(p => p.id === placeId);

    let place;
    try {
        place = await Place.findById(placeId);

    } catch(err){
        const error = new HttpError('Something went wrong, could not find place', 500);
        return next(error);
    }

    // updatedPlace.title = title;
    // updatedPlace.description = description;

    // Tenemos que verificar si solo el usuario que esta autentificado esta intentando editar o eliminar sus places. Si otro usuario intenta
    // editar o eliminar places de otro usuario ya no será posible. Usamos toString porque el place es un tipo de objeto mongoose
    if(place.creator.toString() !== req.userData.userId) {
        const error = new HttpError('You are not allowed to edit this place', 401);
        return next(error);
    }

    place.title = title;
    place.description = description;

    // DUMMY_PLACES[placeIndex] = updatedPlace;
    // Ahora para guardarlo en la base de datos usamos el metodo save, el cual retorna una promesa, por lo que se tiene que usar await y
    // error handling
    try {
        await place.save();

    } catch (err){
        const error = new HttpError('Something went wrong, could not find place', 500);
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
}

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
    // if(!DUMMY_PLACES.find(p => p.id === placeId)){
    //     throw new HttpError('Could not find a place for that id', 404);
    // }

    let place;
    try {
        // Aqui tenemos que hacer varias cosas a la vez, tenemos que buscar el place que queremos eliminar y a la vez tenemos que buscar en
        // nuestra collection users y ver que usuario tiene este place. Nos tenemos que asegurar que al eliminar este place el id se elimine
        // por completo en el user. Despues de que usamos findById para encontrar el place usamos el método populate, el cual nos ayuda a
        // referenciar un documento guardado en otra collection y trabajar con datos guardados en esa collection. Para eso necesitamos una 
        // relación entre las dos collections, la cual definimos en el modelo user al colocar la propiedad ref: 'Place' en la propiedad places
        // y en el modelo place al colocar la propiedad ref: 'User' en la propiedad creator. Sin esto el método populate no funcionaria. Como
        // argumento le tenemos que pasar el nombre de la propiedad a la que queremos acceder, en este caso sería creator que contiene el 
        // valor del user id. Mongoose toma este id para buscar todo el usuario y obtener todos los datos guardados en él. 
        place = await Place.findById(placeId).populate('creator');

    } catch(err){
        const error = new HttpError('Something went wrong, could not find place', 500);
        return next(error);
    }

    // Tenemos que verificar si un place existe
    if(!place){
        const error = new HttpError('Could not find place for this id', 404);
        return next(error);
    }

    // Tenemos que verificar si solo el usuario que esta autentificado esta intentando editar o eliminar sus places. Si otro usuario intenta
    // editar o eliminar places de otro usuario ya no será posible. 
    if(place.creator.id !== req.userData.userId) {
        const error = new HttpError('You are not allowed to delete this place', 401);
        return next(error);
    }

    const imagePath = place.image;

    // DUMMY_PLACES = DUMMY_PLACES.filter(p => p.id !== placeId);

    try {
        // deleteOne es un método especial del tipo de objeto mongoose que nos ayuda a eliminar los datos. 
        // await place.deleteOne();

        // Aquí usamos la misma lógica que cuando creamos el place, usando sessions y transactions
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({ session: sess });

        // Al momento de acceder al creator del place nos encontramos con su id, debido a la conección que hicimos anteriormente mongoose se
        // encarga de retornarnos el documento creator, de esta forma después podemos acceder a sus places. Pull se encarga de eliminar lo que
        // le pasemos como argumento, en este caso el place. También mongoose se encargará de eliminará su id. Aí se elimina el place del user
        place.creator.places.pull(place);

        // Tenemos que guardar nuestro nuevo user creado. Podemos usar save porque gracias a pupulate al acceder a place.creator nos retorna 
        // el objeto completo del user
        await place.creator.save({ session: sess });

        await sess.commitTransaction();

    } catch (err){
        console.log(err)
        const error = new HttpError('Something went wrong, could not delete place', 500);
        return next(error);
    }

    fs.unlink(imagePath, err => {
        console.log(err);
    });

    res.status(200).json({ message: 'Deleted place' });
}

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;