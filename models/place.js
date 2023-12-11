
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const placeSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    address: { type: String, required: true },
    // location: {
    //     lat: { type: Number, required: true },
    //     lng: { type: Number, required: true }
    // },
    // Para decirle a mongo db que este es un id real de mongo db, en type en vez de que sea string tomamos la propiedad Types de mongoose y
    // accedemos a la propiedad objectId. Además tenemos que agregar otra propiedad llamada ref, la cual nos permitirá tener conección entre
    // dos schemas, en este caso queremos tener conección con el schema user 
    creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' }
});

module.exports = mongoose.model('Place', placeSchema);