/* eslint-disable indent,no-console */
const mongoose = require('mongoose');
const dateAndTime = require('date-and-time');
const request = require('request');
const dotenv = require('dotenv').config();

const uri = process.env.MONGO_URI;

const Reminder = require('./reminderSchema');

const db = mongoose.connection;

function makeReminderMessageString(id, event, date, time) {
    return {
        text: `id: ${id}. Reminder: ${event} date: ${date
            } time: ${time}`,
    };
}

function getTimeFromStringOrNumber(time) {
    if (Number.isNaN(parseInt(time, 10))) {
        return new Date(time);
    }
    return new Date(parseInt(time, 10));
}

exports.getReminders = async (body) => {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                const message = [];
                const UserReminders = await Reminder.find({ messengerId: body['messenger user id'] });

                for (const reminder of UserReminders) {
                    const { date } = reminder;
                    const { time } = reminder;
                    const { event } = reminder;
                    const { userReminderId } = reminder;

                    if (body.todays.toLowerCase() === 'todays') {
                        const reminderDate = getTimeFromStringOrNumber(reminder.timeInUTC);

                        if (dateAndTime.isSameDay(new Date(), reminderDate)) {
                            message.push(makeReminderMessageString(userReminderId, event, date, time));
                        }
                    } else {
                        message.push(makeReminderMessageString(userReminderId, event, date, time));
                    }
                }

                if (message.length === 0) {
                    resolve([{ text: 'You have no reminders ' }]);
                } else resolve(message);
            } catch (e) {
                console.error(e);
                reject(new Error('Something went wrong. Try again'));
            } finally {
                mongoose.connection.close();
            }
        });
    });
};

function makeReminder(body, userReminderId, ReminderTimeAndDate) {
    return new Reminder({
        messengerId: body['messenger user id'],
        date: body.date,
        time: body.time,
        event: body.event,
        userReminderId,
        timeInUTC: ReminderTimeAndDate,
    });
}

function createUserReminderId(userReminders) {
    const idArray = [];
    let userReminderId = 1;

    for (const reminder of userReminders) {
        idArray.push(reminder.userReminderId);
    }

    while (idArray.includes(userReminderId)) {
        userReminderId += 1;
    }

    return userReminderId;
}

function validateAndGetDate(timeAndDateString) {
    const dateAndTimePatterns = ['DD.MM.YYYY HH.mm', 'D.MM.YYYY HH.mm', 'DD.MM.YYYY H.mm',
        'D.MM.YYYY H.mm', 'DD.MM.YY HH.mm', 'D.MM.YY HH.mm', 'DD.MM.YY H.mm', 'D.MM.YY H.mm',
        'DD.M.YYYY HH.mm', 'D.M.YYYY HH.mm', 'DD.M.YYYY H.mm', 'D.M.YYYY H.mm', 'DD.M.YY HH.mm',
        'D.M.YY HH.mm', 'DD.M.YY H.mm', 'D.M.YY H.mm'];

    let timeAndDate;

    for (const pattern of dateAndTimePatterns) {
        if (dateAndTime.isValid(timeAndDateString, pattern)) {
            timeAndDate = dateAndTime.parse(timeAndDateString, pattern);
        }
    }

    if (timeAndDate instanceof Date) {
        return timeAndDate;
    }
    throw new Error('Wrong date or time. Try again');
}

exports.addReminder = async (body) => {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                const userReminders = await Reminder.find({ messengerId: body['messenger user id'] });
                const userReminderId = createUserReminderId(userReminders);
                const timeAndDateString = `${body.date} ${body.time}`;
                const { timezone } = body;
                let ReminderTimeAndDate;

                try {
                    ReminderTimeAndDate = validateAndGetDate(timeAndDateString);
                    if (timezone < 0) {
                        ReminderTimeAndDate.setHours(parseFloat(ReminderTimeAndDate.getHours()
                            + Math.abs(timezone)));
                    } else {
                        ReminderTimeAndDate.setHours(parseFloat(ReminderTimeAndDate.getHours()
                            - body.timezone));
                    }
                } catch (e) {
                    console.error(e);
                    reject(new Error(e.message));
                    return;
                }

                const reminder = makeReminder(body, userReminderId, ReminderTimeAndDate);

                Reminder.create(reminder);

                resolve([{ text: `Done: ${userReminderId}. ${ReminderTimeAndDate}` }]);
            } catch (e) {
                console.error(e);
                reject(new Error('Something went wrong. Try again'));
            } finally {
                mongoose.connection.close();
            }
        });
    });
};

async function deleteReminder(messengerId, userReminderId) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                if (userReminderId.toUpperCase() === 'ALL') {
                    await Reminder.remove({ messengerId });
                    resolve([{ text: `Done: ${userReminderId}` }]);
                } else {
                    await Reminder.remove({
                        messengerId,
                        userReminderId,
                    });
                    resolve([{ text: `Done: ${userReminderId}` }]);
                }
            } catch (e) {
                console.error(e);
                reject(new Error('Something went wrong. Try again'));
            } finally {
                mongoose.connection.close();
            }
        });
    });
}

exports.delete = async (body) => {
    const messengerId = body['messenger user id'];
    const { userReminderId } = body;

    return deleteReminder(messengerId, userReminderId);
};

async function acceptReminder(DBRemID) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                await Reminder.remove({ _id: DBRemID });
                resolve([{ text: 'done' }]);
            } catch (e) {
                console.log(e);
                reject(e);
            } finally {
                mongoose.connection.close();
            }
        });
    });
}

async function snoozeReminder(DBRemID) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    return new Promise(async (resolve, reject) => {
        db.once('open', async () => {
            try {
                const newTime = new Date().setMinutes(new Date().getMinutes() + 10);

                await Reminder.findByIdAndUpdate(DBRemID, {
                    timeInUTC: newTime,
                });

                resolve([{ text: 'Reminder snoozed. It will show up again in 10 minutes' }]);
            } catch (e) {
                console.log(e);
                reject(e);
            } finally {
                mongoose.connection.close();
            }
        });
    });
}

exports.acceptOrSnooze = async (body) => {
    const { acceptOrSnooze } = body;
    const { DBRemID } = body;

    return new Promise(async (resolve, reject) => {
        if (acceptOrSnooze.toLowerCase() === 'accept') {
            resolve(acceptReminder(DBRemID));
        } else if (acceptOrSnooze.toLowerCase() === 'snooze') {
            resolve(snoozeReminder(DBRemID));
        } else {
            reject(new Error('Unknown input'));
        }
    });
};

function doMessageRequest(messengerId, message, chatfuelBlockId, DBRemID) {
    const token = process.env.chatfuelBroadcastAPIToken;

    request({
        uri: `https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/${messengerId
            }/send?chatfuel_token=${token}&chatfuel_block_id=${chatfuelBlockId
            }&what=${message}&DBRemID=${DBRemID}`,
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        // "json": request_body
    }, (err) => {
        if (!err) {
            console.log('message sent!');
        } else {
            console.error(`Unable to send message:${err}`);
        }
    });
}


function fireReminder(messengerId, message, DBRemID) {
    const chatfuelBlockId = '5b059420e4b0c78a75f4c2ab';
    doMessageRequest(messengerId, message, chatfuelBlockId, DBRemID);
}

function runRem() {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async () => {
        try {
            const reminders = await Reminder.find();

            for (const reminder of reminders) {
                const reminderTime = getTimeFromStringOrNumber(reminder.timeInUTC);
                const now = new Date();

                if (reminderTime <= now) {
                    fireReminder(reminder.messengerId, `time to "${reminder.event}"`, reminder.id);
                }
            }
        } catch (e) {
            console.log(e);
        } finally {
            mongoose.connection.close();
        }
    });
}

let interval;
exports.start = () => new Promise(async (resolve, reject) => {
    try {
        clearInterval(interval);
        interval = setInterval(() => {
            runRem();
        }, 60000);

        console.log('started');

        resolve('started');
    } catch (e) {
        reject(e);
    }
});

exports.stop = () => new Promise(async (resolve, reject) => {
    try {
        clearInterval(interval);

        console.log('stopped');

        resolve('stopped');
    } catch (e) {
        reject(e);
    }
});

function sendMessage(messengerId, message) {
    const chatfuelBlockId = '5ae34ee1e4b088ff003688cf';
    doMessageRequest(messengerId, message, chatfuelBlockId);
}

