let reminder = require("../models/reminderModel");

exports.getReminders = async (req, res) => {
    // let response = await reminder.getReminders(req.body);
    // console.log(response + " jjj");
    // res.send( response);
    // reminder.getReminders(req.body).then(res => res.json()).then((qwe) => {res.send(qwe)});
    reminder.getReminders(req.body, res);
};

exports.addReminder = (req, res) => {
    res.send(reminder.addReminder(req.body, res));
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
