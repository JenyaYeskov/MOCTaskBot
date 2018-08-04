const mongoose = require("mongoose"),
    dateAndTime = require('date-and-time'),
    request = require('request'),
    dotenv = require('dotenv').config(),
    uri = process.env.MONGO_URI;

let Reminder = require('./reminderSchema');
let db = mongoose.connection;

exports.getReminders = async (body, res) => {
    let result;
    let messengerId = body["messenger user id"];
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));
    console.log("in get rems");

    try {
        result =
            await db.once('open', async () => {
                console.log("in once");
                let message = [];

                try {
                    let rems = await Reminder.find({'messengerId': messengerId});
                    mongoose.connection.close();
                    for (let rem of rems) {

                        let date = rem.date,
                            time = rem.time,
                            event = rem.event,
                            id = rem.remId;

                        if (body["todays"].toLowerCase() === "todays") {

                            let remDate = await dateAndTime.parse(date, "DD.MM.YYYY");

                            if (dateAndTime.isSameDay(new Date(), remDate))
                                message.push({
                                    "text": "id: " + id + ". Reminder: " + event + " date: " + date +
                                    " time: " + time
                                });
                        }
                        else {
                            await message.push({
                                "text": "id: " + id + ". Reminder: " + event + " date: " + date +
                                " time: " + time
                            });
                        }
                    }

                    console.log(message);

                    if (message.length === 0)
                        res.send([{"text": "You have no reminders "}]);
                    else res.send(message);

                }
                catch (e) {
                    console.error(e);
                    res.send([{"text": "error"}]);
                } finally {
                    // mongoose.connection.close();
                }
            })
        // .catch((e) => {
        //     console.error(e);
        //     return [{"text": "error"}];
        // });
    }
    catch (e) {
        console.error(e);
        result = [{"text": "error"}];
    }

    // return result;
};

exports.addReminder = (body, res) => {
    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {
        // let body = req.body;
        let userReminderId;
        let messengerId = body["messenger user id"];
        let ar = [];
        let rem;

        try {
            let rems = await Reminder.find({'messengerId': messengerId});

            userReminderId = rems.length + 1;

            for (let r of rems) {
                await ar.push(r.remId);
            }
            while (ar.includes(userReminderId)) {
                userReminderId = userReminderId + 1;
            }


            let timeAndDate;
            // let timeAndDateString = body.date + " " + (parseFloat(body.time) - off).toFixed(2);
            let timeAndDateString = body.date + " " + body.time;


            try {
                timeAndDate = validateAndSetDate(timeAndDateString);
                timeAndDate.setHours(parseFloat(timeAndDate.getHours() - body["timezone"]));

                rem = await new Reminder({
                    messengerId: body["messenger user id"],
                    date: body.date,
                    time: body.time,
                    event: body.what,
                    remId: userReminderId,
                    timeInUTC: timeAndDate
                });
                await Reminder.create(rem);
            } catch (e) {
                res.send(([{
                    "text": "Wrong date or time. Try again  " + timeAndDate + " "
                    + timeAndDateString
                }]));
            }

            res.send(([{"text": "Done " + userReminderId + " " + timeAndDate}]));
        }
        catch (e) {
            console.error(e);
            res.send(([{"text": "Something went wrong. Try again  "}]));
        }
        finally {
            mongoose.connection.close();
        }
    });
};

exports.delete = (body) => {
    let messengerId = body["messenger user id"];
    let remId = body.remId;

    deleteReminder(messengerId, remId, res);
};

async function deleteReminder(messengerId, remId, res) {
    mongoose.connect(uri);
    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {

        try {
            if (remId.toUpperCase() === "ALL") {
                await Reminder.remove({"messengerId": messengerId});
                res.send( ([{"text": "Done all " + remId}]));
                // res.sendStatus(200);
            }
            else {
                await Reminder.remove({"messengerId": messengerId, "remId": remId});
                res.send( ([{"text": "Done " + remId}]));
                // res.sendStatus(200);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            mongoose.connection.close();
        }
    })
}

exports.acceptOrSnooze = (body) => {
    // let body = req.body;
    let messengerId = body["messenger user id"];
    let acceptOrSnooze = body["acceptOrSnooze"];
    let DBRemID = body["DBRemID"];

    if (acceptOrSnooze.toLowerCase() === "accept") {
        acceptReminder(DBRemID, messengerId, res);

    } else if (acceptOrSnooze.toLowerCase() === "snooze") {
        snoozeReminder(DBRemID, messengerId, res);

    } else {
        trySend(messengerId, "unknown input")
    }
};

async function acceptReminder(DBRemID, messengerId, res) {
    // try {
    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {
        await Reminder.remove({"_id": DBRemID});

        mongoose.connection.close();

        res.send( ([{"text": "done"}]));
        // trySend(messengerId, "done");
        // res.sendStatus(200);
    });
    // } catch (e) {
    //     trySend(messengerId, e);
    //     res.sendStatus(500)
    // } finally {
    //     mongoose.connection.close();
    // }
}

async function snoozeReminder(DBRemID, messengerId, res) {
    // try {
    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {
        let qwe = await Reminder.findById(DBRemID);

        // let temp = dateAndTime.parse(qwe.date + " " + qwe.time, "DD.MM.YYYY HH.mm");
        // temp.setMinutes(temp.getMinutes() + 2);
        //
        // await Reminder.findByIdAndUpdate(DBRemID, {
        //     "date": dateAndTime.format(temp, "DD.MM.YYYY"),
        //     "time": dateAndTime.format(temp, "HH.mm")
        // });

        let old;
        if (isNaN(parseInt(qwe.timeInUTC)))
            old = new Date(qwe.timeInUTC);
        else old = new Date(parseInt(qwe.timeInUTC));
        console.log("old   " + old);
        let n = old.setMinutes(old.getMinutes() + 2);
        console.log("n   " + n);

        await Reminder.findByIdAndUpdate(DBRemID, {
            "timeInUTC": n
            // "time": dateAndTime.format(temp, "HH.mm")
        });

        mongoose.connection.close();
        res.send( ([{"text": "Reminder snoozed. It will show up again in 10 minutes"}]));
        // trySend(messengerId, "Reminder snoozed. Will show up again in 10 minutes");
        // res.sendStatus(200);
    });
    // } catch (e) {
    //     trySend(messengerId, e);
    //     res.sendStatus(500)
    // } finally {
    //     mongoose.connection.close();
    // }
}

function runRem() {
    console.log("in runrem");
    // trySend("1844369452275489", "in runrem", "kkk");

    let todays;
    let par = dateAndTime.format(new Date(), "DD.MM.YYYY");

    // setInterval(() => {

    // try {
    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async () => {
        console.log("in open");

        try {
            todays = await Reminder.find({"date": par});
            mongoose.connection.close();
        } catch (e) {
            console.log("cached in " + e)
        }

        for (let rem of todays) {
            console.log("in for");
            let n;
            if (isNaN(parseInt(rem["timeInUTC"])))
                n = new Date(rem["timeInUTC"]);
            else n = new Date(parseInt(rem["timeInUTC"]));
            console.log("fire n   " + n);
            let now = new Date();

            if (n <= now) {
                fire(rem.messengerId, "time to \"" + rem.event + "\"", rem["_id"]);
                console.log("in if");
                // trySend("1844369452275489", "huinya")
            }
            else {
                // trySend("1844369452275489", "huinya2 " + rem["timeInUTC"]);
                console.log("in else");
            }
        }
    });
}

function fire(mid, smt, DBRemID) {
    let token = "qwYLsCSz8hk4ytd6CPKP4C0oalstMnGdpDjF8YFHPHCieKNc0AfrnjVs91fGuH74";


    request({
        "uri": "https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + mid
        + "/send?chatfuel_token=" + token + "&chatfuel_block_id=5b059420e4b0c78a75f4c2ab&what=" + smt
        + "&DBRemID=" + DBRemID,
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

    // else if (dateAndTime.isValid(timeAndDateString, "DD.MM.YY HH.mm"))
    //     when = dateAndTime.parse(timeAndDateString, "DD.MM.YY HH.mm", true);
    //
    // else if (dateAndTime.isValid(timeAndDateString, "D.MM.YY HH.mm"))
    //     when = dateAndTime.parse(timeAndDateString, "D.MM.YY HH.mm", true);
    //
    // else if (dateAndTime.isValid(timeAndDateString, "DD.MM.YY H.mm"))
    //     when = dateAndTime.parse(timeAndDateString, "DD.MM.YY H.mm", true);
    //
    // else if (dateAndTime.isValid(timeAndDateString, "D.MM.YY H.mm"))
    //     when = dateAndTime.parse(timeAndDateString, "D.MM.YY H.mm", true);
    else throw new Error();

    return when;
}

exports.loh = () => {
    console.log("in loh");
    clearInterval(running);
    running = setInterval(() => {
        // let n = new Date();
        console.log("in set int");
        runRem();

    }, 60000);

    return 200;
    // res.sendStatus(200);
};

function trySend(mid, smt) {
    let token = "qwYLsCSz8hk4ytd6CPKP4C0oalstMnGdpDjF8YFHPHCieKNc0AfrnjVs91fGuH74";

    // fetch("https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + mid +
    //     "/send?chatfuel_token=" + token + "&chatfuel_block_id=5ae34ee1e4b088ff003688cf&what=" + smt, {
    //     "headers": {"Content-Type": "application/json"},
    //     "method": "POST"
    // });

    request({
        "uri": "https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + mid +
        "/send?chatfuel_token=" + token + "&chatfuel_block_id=5ae34ee1e4b088ff003688cf&what=" + smt,
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

exports.checkRems = () => {
    let todays;
    let par = dateAndTime.format(new Date(), "DD.MM.YYYY");

    try {
        mongoose.connect(uri);
        db.once('open', async () => {
            todays = await Reminder.find();

            try {
                for (let rem of todays) {

                    let hh = await validateAndSetDate(rem.date + " " + rem.time);
                    let h = dateAndTime.parse(rem.date + " " + rem.time, "DD.MM.YYYY HH.mm", true);

                    if (hh - new Date() < 0) {
                        trySend("1844369452275489", "ebat " + rem.event)
                    }
                    else {
                        trySend("1844369452275489", "ne ebat " + rem.event)
                    }
                }

                // todays.forEach(rem => {
                //     if (rem.time === dateAndTime.format(new Date(), "HH.mm")) {
                //         trySend("1844369452275489", "ebat")
                //     }
                // });

                // trySend("1844369452275489", "rabotaem");

            } catch (e) {
                console.log(e);
                trySend("1844369452275489", e + "   in catch");
            }

            mongoose.Connection.close();
        });

        res.sendStatus(200);
    }
    catch (e) {
        trySend("1844369452275489", "huinya poluchylas");
        res.sendStatus(403);
    }
};