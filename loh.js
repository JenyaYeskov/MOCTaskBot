let express = require('express');
let app = express();
const mongoose = require('mongoose');

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.get('/*', function (req, res) {
    let jsonResponse = [];
    jsonResponse.push({"text": "Hi. " + (Math.random() * 5 + 1).toFixed(0) + " is a lucky number..."});
    res.send(jsonResponse);
});

let uri = 'mongodb://admin:7447030j@ds237669.mlab.com:37669/moc_chatbot_reminderstask_db';

let db = mongoose.connection;

mongoose.connect(uri);

db.on('error', console.error.bind(console, 'connection error:'));



    // Create event schema
    let remSchema = mongoose.Schema({
        date: String,
        time: String,
        event: String
    });

    // Store event documents in a collection called "songs"
    let Reminder = mongoose.model('rems', remSchema);

    let first = new Reminder({
        date: '23.5.18',
        time: '15.45',
        event: 'pizdyuli'
    });

    let second = new Reminder({
        date: '24.5.18',
        time: '15.45',
        event: 'tobi pizda'
    });

    let list = [first, second];


    Reminder.insertMany(list).then(() => {

        return mongoose.connection.close();

    }).catch(err => {

        // Log any errors that are thrown in the Promise chain
        console.log(err)

    });


