let reminder = require("../models/reminderModel");

exports.getReminders = async (req, res) => {
    let responseMessage = await reminder.getReminders(req.body).catch((e) => {
        console.error(e);
        return (e);
    });
    // console.log(response + " jjj");
    res.send(responseMessage);
    // reminder.getReminders(req.body).then(res => res.json()).then((qwe) => {res.send(qwe)});
    // reminder.getReminders(req.body, res);
};

exports.addReminder = async (req, res) => {
    let responseMessage = await reminder.addReminder(req.body).catch((e) => {
        console.error(e);
        return (e);
    });

    res.send(responseMessage);
};

exports.deleteReminder = (req, res) => {
    res.send(reminder.delete(req.body));
};

exports.acceptOrSnooze = (req, res) => {
    res.send(reminder.acceptOrSnooze(req.body));
};

exports.loh = (req, res) => {

    if (reminder.loh() === 200)
        res.sendStatus(200);
    else res.send("status != 200");

};
