/* eslint-disable indent */
const mongoose = require('mongoose');

const remSchema = new mongoose.Schema({
    userReminderId: Number,
    messengerId: String,
    date: String,
    time: String,
    event: String,
    timeInUTC: String,
});

module.exports = mongoose.model('reminders', remSchema);
