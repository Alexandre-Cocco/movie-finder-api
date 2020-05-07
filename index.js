const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const session = require('express-session')
const bodyParser = require("body-parser")
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const UserModel = require('./models/User')
const MovieModel = require('./models/Movie')

const hostname = 'localhost'
const port = 2000


const app = express()

const Router = express.Router()
const secret = 'RANDOM_TOKEN_SECRET'


app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({
    secret: 'my secret phrase',
    resave: true,
    saveUninitialized: false
}))
app.use(cors())

const options = {
    server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }
}


mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true })
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("we're connected!")
});



Router.route('/login')
    .post((req, res, next) => {
        const email = req.body.email
        const password = req.body.password

        UserModel.findOne({ email: email })
            .exec(function (err, user) {
                if (err) {
                    err.status = 400
                    res.json('error')
                    return
                } else if (!user) {
                    const err = new Error('User not found.')
                    err.status = 401
                    res.json(err)
                    return
                }
                bcrypt.compare(password, user.password, function (err, result) {
                    if (result === true) {
                        res.json({
                            statusCode: 200, user: {
                                email: user.email,
                                _id: user._id,
                                accessRight: user.accessRight,
                                token: user.token
                            }
                        })
                    } else {
                        res.json({ statusCode: 400, message: 'wrong credentials' })
                    }
                })
            })
    })

Router.route('/add')
    .post((req, res, next) => {
        const { email, password, accessRight } = req.body
        const newUser = new UserModel()
        newUser.email = email
        newUser.password = password
        newUser.accessRight = accessRight
        newUser.token = jwt.sign(
            { email: email },
            secret,
            { expiresIn: '24h' })

        newUser.save(function (err) {
            if (err) {
                res.json(err)
            }
            res.send({ message: 'user added' })
        })
    })

Router.route('/delete')
    .delete((req, res, next) => {
        UserModel.remove({}, function (err) {
            if (err) {
                res.json(err)
            } else {
                res.end('success')
            }
        }
        )
    })



Router.route('/all')
    .all((req, res, next) => {
        UserModel.find(function (err, users) {
            if (err) {
                res.json(err)
            }
            res.json(users)
        })
    })

Router.route('/movie')
    .get((req, res, next) => {
        jwt.verify(req.query.token, secret, function (err, decoded) {
            if (err) {
                res.json(err)
            }
        })

        const { term, releaseDate, limit, offset } = req.query
        const conditions = { 'title': { $regex: new RegExp(term, "ig") } }
        let maxResults = 0
        if (releaseDate) {
            conditions.releaseDate = releaseDate
        }

        MovieModel.count(conditions).exec((err, count) => {
            maxResults = count
        })
        MovieModel
            .find(conditions)
            .sort({ 'releaseDate': -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .exec((err, movies) => {
                if (err) {
                    console.log(err)
                    res.json(err)
                }
                res.json({ maxResults: maxResults, movies: movies })
            })
    })
    .post((req, res, next) => {
        const { title, picture, releaseDate, token } = req.body
        const newMovie = new MovieModel()
        newMovie.title = title
        newMovie.picture = picture
        newMovie.releaseDate = releaseDate

        newMovie.save(function (err) {
            if (err) {
                res.json(err)
            }
            res.send({ message: 'movie added' })
        })
    })

Router.route('/allMovies')
    .all((req, res, next) => {
        MovieModel.find(function (err, movies) {
            if (err) {
                res.json(err)
            }
            res.json(movies)
        })
    })


app.use(Router)

app.listen(port, hostname, () => {
    console.log("server : http://" + hostname + ":" + port)
})

