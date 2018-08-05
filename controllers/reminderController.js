let reminder = require("../models/reminderModel");

exports.getReminders = async (req, res) => {
    handleRequest(reminder.getReminders(req.body), res);
};

exports.addReminder = async (req, res) => {
    handleRequest(reminder.addReminder(req.body), res);
};

exports.deleteReminder = async (req, res) => {
    handleRequest(reminder.delete(req.body), res);
};

exports.acceptOrSnooze = async (req, res) => {
    handleRequest(reminder.acceptOrSnooze(req.body), res);
};

exports.start = async (req, res) => {
    handleRequest(reminder.start(), res);
};

exports.stop = async (req, res) => {
    handleRequest(reminder.stop(), res);
};

async function handleRequest(method, res) {
    let responseMessage = await method.catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
}
