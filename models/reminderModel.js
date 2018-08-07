const mongoose = require("mongoose"),
    dateAndTime = require('date-and-time'),
    request = require('request'),
    dotenv = require('dotenv').config(),
    uri = process.env.MONGO_URI;

let Reminder = require('./reminderSchema');
let db = mongoose.connection;

exports.getReminders = async (body) => {
    let messengerId = body["messenger user id"];
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                let message = [];
                let UserReminders = await Reminder.find({'messengerId': messengerId});

                for (let reminder of UserReminders) {

                    let date = reminder.date,
                        time = reminder.time,
                        event = reminder.event,
                        userReminderId = reminder.userReminderId;

                    if (body["todays"].toLowerCase() === "todays") {
                        let reminderDate = dateAndTime.parse(date, "DD.MM.YYYY");

                        if (dateAndTime.isSameDay(new Date(), reminderDate))
                            message.push(createReminderMessageString(userReminderId, event, date, time));
                    }
                    else {
                        message.push(createReminderMessageString(userReminderId, event, date, time));
                    }
                }

                if (message.length === 0)
                    resolve([{"text": "You have no reminders "}]);
                else resolve(message);
            }
            catch (e) {
                console.error(e);
                reject([{"text": "error"}]);
            }
            finally {
                mongoose.connection.close();
            }
        })
    });
};

function createReminderMessageString(id, event, date, time) {
    return {
        "text": "id: " + id + ". Reminder: " + event + " date: " + date +
        " time: " + time
    }
}

function makeReminder(body, userReminderId, ReminderTimeAndDate) {
    return new Reminder({
        messengerId: body["messenger user id"],
        date: body.date,
        time: body.time,
        event: body.event,
        userReminderId: userReminderId,
        timeInUTC: ReminderTimeAndDate
    });
}

exports.addReminder = async (body) => {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                let userReminders = await Reminder.find({'messengerId': body["messenger user id"]});
                let userReminderId = createUserReminderId(userReminders);
                let ReminderTimeAndDate;
                let timeAndDateString = body.date + " " + body.time;

                try {
                    ReminderTimeAndDate = validateAndSetDate(timeAndDateString);
                    ReminderTimeAndDate.setHours(parseFloat(ReminderTimeAndDate.getHours() - body["timezone"]));
                } catch (e) {
                    console.error(e);
                    reject([{
                        "text": "Wrong date or time. Try again  " + ReminderTimeAndDate + " "
                        + timeAndDateString
                    }]);
                    return;
                }

                let reminder = makeReminder(body, userReminderId, ReminderTimeAndDate);

                Reminder.create(reminder);

                resolve([{"text": "Done " + userReminderId + " " + ReminderTimeAndDate}]);
            }
            catch (e) {
                console.error(e);
                reject([{"text": "Something went wrong. Try again  "}]);
            }
            finally {
                mongoose.connection.close();
            }
        });
    })
};

function createUserReminderId(userReminders) {
    let idArray = [];

    let userReminderId = userReminders.length + 1;

    for (let reminder of userReminders) {
        idArray.push(reminder.userReminderId);
    }

    while (idArray.includes(userReminderId)) {
        userReminderId = userReminderId + 1;
    }

    return userReminderId;
}

exports.delete = async (body) => {
    let messengerId = body["messenger user id"];
    let userReminderId = body.userReminderId;

    return deleteReminder(messengerId, userReminderId);
};

async function deleteReminder(messengerId, userReminderId) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                if (userReminderId.toUpperCase() === "ALL") {
                    await Reminder.remove({"messengerId": messengerId});
                    resolve([{"text": "Done all " + userReminderId}]);
                }
                else {
                    await Reminder.remove({
                        "messengerId": messengerId,
                        "userReminderId": userReminderId
                    });
                    resolve([{"text": "Done " + userReminderId}]);
                }
            }
            catch (e) {
                console.error(e);
                reject([{"text": "Something went wrong. Try again"}]);
            }
            finally {
                mongoose.connection.close();
            }
        })
    })
}

exports.acceptOrSnooze = async (body) => {
    let acceptOrSnooze = body["acceptOrSnooze"];
    let DBRemID = body["DBRemID"];

    return new Promise(async (resolve, reject) => {
        if (acceptOrSnooze.toLowerCase() === "accept") {
            resolve(acceptReminder(DBRemID));

        } else if (acceptOrSnooze.toLowerCase() === "snooze") {
            resolve(snoozeReminder(DBRemID));

        } else {
            reject([{"text": "Unknown input"}])
        }
    })
};

async function acceptReminder(DBRemID) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async function callback() {
            try {
                await Reminder.remove({"_id": DBRemID});
                resolve([{"text": "done"}]);
            } catch (e) {
                console.log(e);
                reject(e.toString());
            } finally {
                mongoose.connection.close();
            }
        });
    })
}

async function snoozeReminder(DBRemID) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                let newTime = new Date().setMinutes(new Date().getMinutes() + 10);

                await Reminder.findByIdAndUpdate(DBRemID, {
                    "timeInUTC": newTime
                });

                resolve([{"text": "Reminder snoozed. It will show up again in 10 minutes"}]);
            } catch (e) {
                console.log(e);
                reject(e.toString());
            } finally {
                mongoose.connection.close();
            }
        });
    })
}

function getTimeFromStringOrNumber(time) {
    if (isNaN(parseInt(time)))
        return new Date(time);
    else return new Date(parseInt(time));
}

function runRem() {
    let today = dateAndTime.format(new Date(), "DD.MM.YYYY");

    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async () => {
        try {
            let todaysReminders = await Reminder.find({"date": today});

            for (let reminder of todaysReminders) {

                let reminderTime = getTimeFromStringOrNumber(reminder["timeInUTC"]);

                let now = new Date();

                if (reminderTime <= now) {
                    fireReminder(reminder.messengerId, "time to \"" + reminder.event + "\"", reminder["_id"]);
                }
                else {
                    console.log("in else");
                }
            }
        } catch (e) {
            console.log(e)
        }
        finally {
            mongoose.connection.close();
        }
    });
}

function doMessageRequest(messengerId, message, chatfuelBlockId, DBRemID) {
    let token = process.env.chatfuelBroadcastAPIToken;

    request({
        "uri": "https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + messengerId
        + "/send?chatfuel_token=" + token + "&chatfuel_block_id=" + chatfuelBlockId
        + "&what=" + message + "&DBRemID=" + DBRemID,
        "headers": {"Content-Type": "application/json"},
        "method": "POST"
        // "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

function fireReminder(messengerId, message, DBRemID) {
    let chatfuelBlockId = "5b059420e4b0c78a75f4c2ab";
    doMessageRequest(messengerId, message, chatfuelBlockId, DBRemID);
}

function validateAndSetDate(timeAndDateString) {
    let when = new Date();

    if (dateAndTime.isValid(timeAndDateString, "DD.MM.YYYY HH.mm"))
        when = dateAndTime.parse(timeAndDateString, "DD.MM.YYYY HH.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "D.MM.YYYY HH.mm"))
        when = dateAndTime.parse(timeAndDateString, "D.MM.YYYY HH.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "DD.MM.YYYY H.mm"))
        when = dateAndTime.parse(timeAndDateString, "DD.MM.YYYY H.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "D.MM.YYYY H.mm"))
        when = dateAndTime.parse(timeAndDateString, "D.MM.YYYY H.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "DD.MM.YY HH.mm"))
        when = dateAndTime.parse(timeAndDateString, "DD.MM.YY HH.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "D.MM.YY HH.mm"))
        when = dateAndTime.parse(timeAndDateString, "D.MM.YY HH.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "DD.MM.YY H.mm"))
        when = dateAndTime.parse(timeAndDateString, "DD.MM.YY H.mm", true);

    else if (dateAndTime.isValid(timeAndDateString, "D.MM.YY H.mm"))
        when = dateAndTime.parse(timeAndDateString, "D.MM.YY H.mm", true);
    else throw new Error();

    return when;
}

let interval;
exports.start = () => {
    return new Promise(async (resolve, reject) => {
        try {
            clearInterval(interval);
            interval = setInterval(() => {
                runRem();
                sendMessage("1844369452275489", "still alive")
            }, 60000);

            console.log("started");

            resolve("started")
        } catch (e) {
            reject(e.toString())
        }
    })
};

exports.stop = () => {
    return new Promise(async (resolve, reject) => {
        try {
            clearInterval(interval);

            console.log("stopped");

            resolve("stopped")
        } catch (e) {
            reject(e.toString())
        }
    })
};

function sendMessage(messengerId, message) {
    let chatfuelBlockId = "5ae34ee1e4b088ff003688cf";
    doMessageRequest(messengerId, message, chatfuelBlockId);
}
