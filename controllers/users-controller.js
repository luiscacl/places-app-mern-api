// La idea de los controllers es tener todas las funciones middleware que son ejecutadas por ciertas rutas. Así se tiene una mejor organizacion

const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

let DUMMY_USERS = [
    {
        id: 'u1',
        name: 'Pancho',
        email: 'pancho@hotmail.com',
        password: 'testers'
    }
];

const getUsers = async (req, res, next) => {
    // Al obtener a nuestros usuarios lo mejor es hacerlo sin retornar la contraseña para no exponerlos. Para esto en find colocamos como
    // segundo argumento las propiedades que queremos extraer. Si queremos decirle que retorne todo menos alguna propiedad colocamos un
    // signo de menos: -propiedad
    let users;
    try {
        users = await User.find({}, '-password');
        
    } catch (err){
        const error = new HttpError('Fetching users failed, please try again later', 500);
        return next(error);
    }

    // res.json({ users: DUMMY_USERS });
    
    res.json({ users: users.map(user => user.toObject({ getters: true })) });
}

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next (new HttpError('Invalid inputs passed, please check your data', 422));
    }
    
    const { name, email, password } = req.body;

    // const hasUser = DUMMY_USERS.find(u => u.email === email);
    // if(hasUser){
    //     throw new HttpError('Could not create user, email already exists', 422);
    // }

    // Find one simplemente encuentra un documento viendo el argumento que le pasamos, el cual tiene que ser un objeto con la propiedad y el 
    // valor que queremos
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
        console.log(existingUser);

    } catch (err) {
        const error = new HttpError('Signing up failed, please try again later', 500);
        return next(error);
    }

    // If user is already created
    if(existingUser){
        const error = new HttpError('User exists already, please login instead', 422);
        return next(error);
    }

    let hashedPassword;
    // Como primer argumento de hash pasamos el elemento que queremos codificar, luego un número que determina el nivel de dificultad que es
    // para desencriptar el valor
    try {
        hashedPassword = await bcrypt.hash(password, 12);

    } catch (err) {
        const error = new HttpError(
            'Could not create user, please try again.',
            500
        );
        return next(error);
    }

    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    });

    // DUMMY_USERS.push(createdUser);
    try {
        await createdUser.save();

    } catch (err){
        const error = new HttpError('Signing up failed, please try again', 500);
        return next(error);
    }

    // Creating the token
    // Al método sign le tenemos que pasar un objeto con los valores que queremos codificar, el segundo argumento es un string que solo el
    // servidor sabe, sin pasarselo jamás a ningún cliente, el tercer argumento es opcional, aquí podemos configurar al token con un objeto,
    // una recomendación recomendada es definir en cuánto tiempo el token va a expirar, porque el token no puede ser falsificado o editado 
    // por el cliente, ya que si intentaramos acceder al token como no sabemos la private key generearíamos un token invalido, aún si
    // decodificamos una parte del token y modificamos el userId e intentamos recrear el token no lo podríamos hacer porque no sabemos la
    // private key del token. Si por algun motivo decodificaran la private key (aunque es muy dificil), este token expiraría en 1 hora
    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, email: createdUser.email},
            process.env.JWT_KEY,
            {expiresIn: '1h'}
        );

    } catch (err) {
        const error = new HttpError('Signing up failed, please try again', 500);
        return next(error);
    }

    // En vez de mandar todo el objeto como lo hacíamos anteriormente mandamos solo las cosas necesarias que queramos como respuesta
    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token });
}

const login = async (req, res, next) => {
    const { email, password } = req.body;

    // const identifiedUser = DUMMY_USERS.find(u => u.email === email);

    // if(!identifiedUser || identifiedUser.password !== password){
    //     throw new HttpError('Could not identify user, credentials seem to be wrong', 401);
    // }

    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
        console.log(existingUser);

    } catch (err) {
        const error = new HttpError('Loggin in failed, please try again later', 500);
        return next(error);
    }

    if(!existingUser /*|| existingUser.password !== password*/){
        const error = new HttpError('Invalid credentials, could not log you in', 403);
        return next(error);
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);

    } catch (err) {
        const error = new HttpError(
            'Could not log you in, please check your credentials and try again.',
            500
        );
        return next(error);
    }

    if(!isValidPassword) {
        const error = new HttpError('Invalid credentials, could not log you in', 403);
        return next(error);
    }

    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, email: existingUser.email},
            process.env.JWT_KEY,
            {expiresIn: '1h'}
        );

    } catch (err) {
        const error = new HttpError('Logging in failed, please try again', 500);
        return next(error);
    }

    // En vez de mandar todo el objeto como lo hacíamos anteriormente mandamos solo las cosas necesarias que queramos como respuesta
    res.json({ message: 'Logged in!', userId: existingUser.id, email: existingUser.email, token: token });
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;