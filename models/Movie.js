const mongoose = require('mongoose')

const MovieSchema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    releaseDate: {
        type: Date,
        required: true,
    },
    picture: {
        type: String,
        required: true
    },
})


const Movie = mongoose.model('Movie', MovieSchema)
module.exports = Movie