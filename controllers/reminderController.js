let reminder = require("../models/reminderModel");

exports.getReminders = async (req, res) => {
    let responseMessage = await reminder.getReminders(req.body).catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
};

exports.addReminder = async (req, res) => {
    let responseMessage = await reminder.addReminder(req.body).catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
};

exports.deleteReminder = async (req, res) => {
    let responseMessage = await reminder.delete(req.body).catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
};

exports.acceptOrSnooze = async (req, res) => {
    let responseMessage = await reminder.acceptOrSnooze(req.body).catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
};

exports.loh = (req, res) => {

    if (reminder.loh() === 200)
        res.sendStatus(200);
    else res.send("status != 200");

};
