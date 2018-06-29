let mongoose = require('mongoose');

let remSchema = new mongoose.Schema({
    remId: Number,
    messengerId: String,
    date: String,
    time: String,
    event: String,
    timeInUTC: String
});

module.exports = mongoose.model('reminders', remSchema);