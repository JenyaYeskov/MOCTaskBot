// let express = require('express');
// let app = express();
// const mongoose = require('mongoose');
//
// app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));
//
// app.get('/*', function (req, res) {
//     let jsonResponse = [];
//     jsonResponse.push({"text": "Hi. " + (Math.random() * 5 + 1).toFixed(0) + " is a lucky number..."});
//     res.send(jsonResponse);
// });
//
// let remSchema = mongoose.Schema({
//     date: String,
//     time: String,
//     event: String
// });
//
// let Reminder = mongoose.model('rems', remSchema);
//
// let uri = 'mongodb://admin:7447030j@ds237669.mlab.com:37669/moc_chatbot_reminderstask_db';
//
// let db = mongoose.connection;
//
// mongoose.connect(uri);
//
// db.on('error', console.error.bind(console, 'connection error:'));
//
//
// db.once('open', function callback() {
//
//     let first = new Reminder({
//         date: '23.5.18',
//         time: '15.45',
//         event: 'pizdyuli'
//     });
//
//     let second = new Reminder({
//         date: '24.5.18',
//         time: '15.45',
//         event: 'tobi pizda'
//     });
//
//     let list = [first, second];
//
//     Reminder.insertMany(list).then(() => {
//
//         mongoose.connection.close();
//
//         console.log("done");
//     }).catch(err => {
//
//         // Log any errors that are thrown in the Promise chain
//         console.log(err)
//
//     });
// });
//
//
//
//
//

dateAndTime = require('date-and-time');
// let a : Date;
// a = new Date("28.03.2015")
a = dateAndTime.parse("28.13.2015", "DD.MM.YYYY")
let now = new Date()
let date = "13.04.2018"
let remDate ;

// remDate = dateAndTime.parse(date, "DD.MM.YYYY");
//
// if (dateAndTime.isSameDay(now, remDate)) {
//     console.log("loh")
// }
// else console.log("hui " + now + "   " + remDate)

function fu(callback) {
    // remDate = dateAndTime.parse(date, "DD.MM.YYYY");
    callback(dateAndTime.parse(date, "DD.MM.YYYY"))
}

fu((remDate) => {
    if (dateAndTime.isSameDay(now, remDate)) {
        console.log("loh")
    }
    else console.log("hui " + now + "   " + remDate)

})
//     .then(() => {
//
//     if (dateAndTime.isSameDay(now, remDate)) {
//         console.log("loh")
//     }
//
// })
//     .then(() => {
//     console.log("loh2")
// })