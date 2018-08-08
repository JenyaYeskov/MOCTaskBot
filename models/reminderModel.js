const mongoose = require("mongoose"),
    dateAndTime = require('date-and-time'),
    request = require('request'),
    dotenv = require('dotenv').config(),
    uri = process.env.MONGO_URI;

let Reminder = require('./reminderSchema');
let db = mongoose.connection;

exports.getReminders = async (body) => {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                let message = [];
                let UserReminders = await Reminder.find({'messengerId': body["messenger user id"]});

                for (let reminder of UserReminders) {

                    let date = reminder.date,
                        time = reminder.time,
                        event = reminder.event,
                        userReminderId = reminder.userReminderId;

                    if (body["todays"].toLowerCase() === "todays") {
                        let reminderDate = getTimeFromStringOrNumber(reminder["timeInUTC"]);

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
                reject([{"text": "Something went wrong. Try again"}]);
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
                let timezone = body["timezone"];

                try {
                    ReminderTimeAndDate = validateAndGetDate(timeAndDateString);
                    if (timezone < 0)
                        ReminderTimeAndDate.setHours(parseFloat(ReminderTimeAndDate.getHours() + Math.abs(timezone)));
                    else ReminderTimeAndDate.setHours(parseFloat(ReminderTimeAndDate.getHours() - body["timezone"]));
                } catch (e) {
                    console.error(e);
                    reject([{
                        "text": e.message
                    }]);
                    return;
                }

                let reminder = makeReminder(body, userReminderId, ReminderTimeAndDate);

                Reminder.create(reminder);

                resolve([{"text": "Done: " + userReminderId + " " + ReminderTimeAndDate}]);
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
    let userReminderId = 1;

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
                    resolve([{"text": "Done: " + userReminderId}]);
                }
                else {
                    await Reminder.remove({
                        "messengerId": messengerId,
                        "userReminderId": userReminderId
                    });
                    resolve([{"text": "Done: " + userReminderId}]);
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
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async () => {
        try {
            let reminders = await Reminder.find();

            for (let reminder of reminders) {

                let reminderTime = getTimeFromStringOrNumber(reminder["timeInUTC"]);
                let now = new Date();

                if (reminderTime <= now) {
                    fireReminder(reminder.messengerId, "time to \"" + reminder.event + "\"", reminder["_id"]);
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

function fireReminder(messengerId, message, DBRemID) {
    let chatfuelBlockId = "5b059420e4b0c78a75f4c2ab";
    doMessageRequest(messengerId, message, chatfuelBlockId, DBRemID);
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

function validateAndGetDate(timeAndDateString) {
    let dateAndTimePatterns = ["DD.MM.YYYY HH.mm", "D.MM.YYYY HH.mm", "DD.MM.YYYY H.mm",
        "D.MM.YYYY H.mm", "DD.MM.YY HH.mm", "D.MM.YY HH.mm", "DD.MM.YY H.mm", "D.MM.YY H.mm",
        "DD.M.YYYY HH.mm", "D.M.YYYY HH.mm", "DD.M.YYYY H.mm", "D.M.YYYY H.mm", "DD.M.YY HH.mm",
        "D.M.YY HH.mm", "DD.M.YY H.mm", "D.M.YY H.mm"];

    let timeAndDate;

    for (let pattern of dateAndTimePatterns) {
        if (dateAndTime.isValid(timeAndDateString, pattern)) {
            timeAndDate = dateAndTime.parse(timeAndDateString, pattern);
        }
    }

    if (timeAndDate instanceof Date)
        return timeAndDate;
    else throw new Error("Wrong date or time. Try again");
}

let interval;
exports.start = () => {
    return new Promise(async (resolve, reject) => {
        try {
            clearInterval(interval);
            interval = setInterval(() => {
                runRem();
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


