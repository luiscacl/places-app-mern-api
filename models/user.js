const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

// Si tenemos una base de datos demasiado grande lo mejor es hacer que nuestro email pueda ser consultado tan rápido como sea posible al 
// momento que se haga sign in, log in, etc. Para esto usamos la propiedad unique con el valor true, creando un index para que este email
// sea consultado más rapido. Aún así falta una validación interna para ver si el email ya existe en nuestra base de datos, para eso usamos
// la libreria mongoose unique validator
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    // Debido a que un usuario puede tener muchos places agregamos un arreglo de objetos
    places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place' }]
});

// Con la libreria que instalamos de mongoos unique validator al usarla en el método plugin nos aseguramos que al consultar el email lo haga
// tan rápido como sea posible en nuestra base de datos y nos aseguramos que solo podemos crear un nuevo usuario si no existe anteriormente
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);