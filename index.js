'use strict';

const
    PAGE_ACCESS_TOKEN2 = process.env.PAGE_ACCESS_TOKEN2,
    PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN,
    request = require('request'),
    dotenv = require('dotenv').config(),
    mongoose = require('mongoose'),
    uri = process.env.MONGO_URI,
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()),
    util = require('util'),
    schedule = require('node-schedule'),
    CronJob = require('cron').CronJob,
    dateAndTime = require('date-and-time');

let db = mongoose.connection;
let remSchema = mongoose.Schema({
    remId: Number,
    messengerId: String,
    date: String,
    time: String,
    event: String
});


let Reminder = mongoose.model('rems', remSchema);

app.use(bodyParser.urlencoded({extended: false}));

app.listen(process.env.PORT || 5858, () => console.log('webhook is listening'));


app.post("/getRems", (req, res) => {

    let body = req.body;
    let messengerId = body["messenger user id"];

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {
        let message = [];

        function dateParser(date, callback) {

            callback(dateAndTime.parse(date, "DD.MM.YYYY"));
        }

        // function dateParserPromise(date) {
        //
        //     return new Promise((resolve, reject) => {
        //         dateAndTime.parse(date, "DD.MM.YYYY", (err, data) => {
        //             if (err) reject(err);
        //             else resolve(data);
        //
        //         });
        //     })
        // }

        try {
            let rems = await Reminder.find({'messengerId': messengerId});
            let date;
            let time;
            let event;
            let id;

            for (let rem of rems) {

                date = rem.date;
                time = rem.time;
                event = rem.event;
                id = rem.remId;

                if (body["todays"].toLowerCase() === "todays") {
                    dateParser(date, (remDate) => {
                        // let remDate = await dateParserPromise(date);
                        // let rd = util.promisify(dateParser);
                        // let remDate = await rd(date);

                        if (dateAndTime.isSameDay(new Date(), remDate))
                            message.push({
                                "text": "id: " + id + ". Reminder: " + event + " date: " + date +
                                " time: " + time
                            });
                    })
                }
                else {
                    await message.push({
                        "text": "id: " + id + ". Reminder: " + event + " date: " + date +
                        " time: " + time
                    });
                }
            }

            if (message.length === 0)
                res.send([{"text": "You have no reminders "}]);
            else res.send(message);
            // else res.send([{"text": req.toString()}]);

            mongoose.connection.close();
        }
        catch (e) {
            res.send([{"text": "error"}]);
            console.error(e);
            mongoose.connection.close();
        }
    });
});


// app.post("/getRems", (req, res) => {
//
//     let body = req.body;
//     let messengerId = body["messenger user id"];
//
//     mongoose.connect(uri);
//
//     db.on('error', console.error.bind(console, 'connection error:'));
//
//     db.once('open', function callback() {
//         let message = [];
//
//         function dateParser(date, callback) {
//             callback(dateAndTime.parse(date, "DD.MM.YYYY"));
//         }
//
//         Reminder.find({'messengerId': messengerId}).then(rems => {
//             let date;
//             let time;
//             let event;
//             let id;
//
//             rems.forEach(rem => {
//                 date = rem.date;
//                 time = rem.time;
//                 event = rem.event;
//                 id = rem.remId;
//
//                 if (body["todays"].toLowerCase() === "todays") {
//                     dateParser(date, (remDate) => {
//                         if (dateAndTime.isSameDay(new Date(), remDate))
//                             message.push({
//                                 "text": "id: " + id + ". Reminder: " + event + " date: " + date +
//                                 " time: " + time
//                             });
//                     })
//                 }
//                 else {
//                     message.push({
//                         "text": "id: " + id + ". Reminder: " + event + " date: " + date +
//                         " time: " + time
//                     });
//                 }
//             })
//         }).then(() => {
//             if (message.length === 0)
//                 res.send([{"text": "You have no reminders"}]);
//             else res.send(message);
//         }).then(() => {
//             mongoose.connection.close();
//         }).catch(err => {
//             console.log(err)
//         });
//     });
// });


async function fireReminder(reminderId) {
    try {
        let rem = await Reminder.findOne(reminderId);
        callSendAPI(rem.messengerId, {"text": "Hey, it's time for \"" + rem.event + "\""});
        trySend(rem.messengerId, "dobryi ranok " + rem.time);

    } catch (e) {
        trySend("1844369452275489", "error in fire");
    }
//    TODO: accept/snooze buttons
}

app.post("/addRem", (req, res) => {

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {
        let body = req.body;
        let userReminderId;
        let messengerId = body["messenger user id"];
        let ar = [];
        let rem;

        // noinspection JSAnnotator
        try {
            let rems = await Reminder.find({'messengerId': messengerId});

            userReminderId = rems.length + 1;

            for (let r of rems) {
                await ar.push(r.remId);
            }
            while (ar.includes(userReminderId)) {
                userReminderId = userReminderId + 1;
            }

            rem = await new Reminder({
                messengerId: body["messenger user id"],
                date: body.date,
                time: body.time,
                event: body.what,
                remId: userReminderId
            });

            let timeAndDate;
            let off = parseInt(body["timezone"]);
            // let timeAndDateString = body.date + " " + (parseFloat(body.time) - off).toFixed(2);
            let timeAndDateString = body.date + " " + body.time;


            try {
                timeAndDate = validateAndSetDate(timeAndDateString);
                await Reminder.create(rem);
                timeAndDate.setHours(parseFloat(timeAndDate.getHours() - body["timezone"]));
            } catch (e) {
                res.send([{"text": "Wrong date or time. Try again  " + timeAndDate + " " + timeAndDateString}]);
            }

            let qwe = await Reminder.findOne({"messengerId": messengerId, "remId": userReminderId});
            console.log(qwe);

            let reminderId = qwe["_id"];

            // try {
            //
            //     evarr.push(new CronJob({
            //         cronTime: timeAndDate,
            //         onTick: function () {
            //             fireReminder(reminderId);
            //         }, start: true
            //     }));
            //
            //     // let ev = await new Event({
            //     //     event: qwe
            //     // });
            //
            //     // await Event.create(ev);
            // }
            // catch (e) {
            //     res.send([{"text": "hueta"}])
            // }


            // new CronJob(timeAndDate, function () {
            //     fireReminder(reminderId);
            // }, null, true);


            // schedule.scheduleJob(timeAndDate, () => {
            //     fireReminder(reminderId)
            //     console.log(" ty loh " + reminderId);
            // });


            res.send([{"text": "Done " + userReminderId + " " + timeAndDate}]);
        }
        catch (e) {
            console.error(e);
            mongoose.connection.close();
            res.send([{"text": "Something went wrong. Try again  "}]);
        }
        finally {
            mongoose.connection.close();
        }
    });
});


//promise based version
// app.post("/addRem", (req, res) => {
//
//     mongoose.connect(uri);
//
//     db.on('error', console.error.bind(console, 'connection error:'));
//
//     db.once('open', function callback() {
//         let body = req.body;
//         let id;
//         let ar = [];
//         let rem;
//
//         Reminder.find({'messengerId': body["messenger user id"]}).then(rems => {
//             id = rems.length + 1;
//
//             rems.forEach(r => {
//                 ar.push(r.remId);
//             });
//
//         }).then(() => {
//             while (ar.includes(id)) {
//                 id = id + 1;
//             }
//
//         }).then(() => {
//             rem = new Reminder({
//                 messengerId: body["messenger user id"],
//                 date: body.date,
//                 time: body.time,
//                 event: body.what,
//                 remId: id
//             });
//
//         }).then(() => {
//             Reminder.create(rem)
//         }).then(() => {
//             mongoose.connection.close();
//         }).then(() => {
//             res.send([{"text": "Done " + id}]);
//         }).catch(err => {
//             console.log(err)
//         });
//     });
// });


app.post("/delete", (req, res) => {

    let body = req.body;
    let messengerId = body["messenger user id"];
    let remId = body.remId;

    deletion(messengerId, remId, res);
});


app.post("/acceptOrSnooze", (req, res) => {
    let body = req.body;
    let messengerId = body["messenger user id"];
    let acceptOrSnooze = body["acceptOrSnooze"];
    let DBRemID = body["DBRemID"];

    if (acceptOrSnooze.toLowerCase() === "accept") {
        try {
            mongoose.connect(uri);

            db.on('error', console.error.bind(console, 'connection error:'));

            db.once('open', async function callback() {
                await Reminder.remove({"messengerId": DBRemID});

                res.sendStatus(200);
            });
        } catch (e) {
            trySend(messengerId, e);
            res.sendStatus(500)
        } finally {
            mongoose.connection.close();
        }

    } else if (acceptOrSnooze.toLowerCase() === "snooze") {


    } else {

    }

});


app.get("/", function (req, res) {
    res.send("deployed");
});


app.get("/loh", (req, res) => {
    // let body = req.body;
    // let messengerId = body["messenger user id"];

    // for (let i = 1; i < 59; i=i+3) {
    //     let q = i + ' * * * *';
    //     let d = new Date()
    //     d.setMinutes(d.getMinutes() + 1)
    //
    //     schedule.scheduleJob(d, function()  {
    //         console.log(" ty loh " );
    //         trySend("1844369452275489", "hui");
    //         handleMessage("1844369452275489", {"text": "zdarova"});
    //         res.send("norm")
    //     });
    // }
    let nodeCron = require('node-cron');
    let CronJob = require('cron').CronJob;

    setInterval(() => {
        // trySend("1844369452275489", "in loh setint");
        runRem();
    }, 60000);

    // for (let i = 0; i < 59; i = i + 5) {
    //     let q = i + ' * * * * *';
    // }


    //     let d = new Date();
    //     console.log("loh")
    //     d.setMinutes(d.getMinutes() + 5);
    //     new CronJob(d, function () {
    //         console.log('cron');
    //         trySend("1844369452275489", "pizda2 " + d + "  " + d.getHours());
    //         callSendAPI("1844369452275489", {"text": "zdarova2"});
    //     }, null, true);
    //
    // trySend("1844369452275489", "pizda" + d);
    // callSendAPI("1844369452275489", {"text": "zdarova"});


    res.send("loh");
});


app.post("/webhook", (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFICATION_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});


// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text) {

        // Create the payload for a basic text message
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
    }
    else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Sends the response message
    callSendAPI(sender_psid, response);

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = {"text": "Thanks!"}
    } else if (payload === 'no') {
        response = {"text": "Oops, try sending another image."}
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {"access_token": PAGE_ACCESS_TOKEN2},
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}

function trySend(mid, smt, DBRemID) {
    let token = "qwYLsCSz8hk4ytd6CPKP4C0oalstMnGdpDjF8YFHPHCieKNc0AfrnjVs91fGuH74";

    request({
        "uri": "https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + mid + "/send?chatfuel_token=" + token + "&chatfuel_block_id=5ae34ee1e4b088ff003688cf&what=" + smt + "&DBRemID=" + DBRemID,
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

    //doesn't work
    // request({
    //     "uri": "https://api.chatfuel.com/users/" + mid + "/messages?chatfuel_token=" + token + "&chatfuel_block_id=5ae34ee1e4b088ff003688cf&what=loh",
    //     "headers": {"Content-Type": "application/json"},
    //     "method": "POST"
    //     // "json": request_body
    // }, (err, res, body) => {
    //     if (!err) {
    //         console.log('message sent!')
    //     } else {
    //         console.error("Unable to send message:" + err);
    //     }
    // });
}

async function runRem() {

    // trySend("1844369452275489", "in runrem", "kkk");

    let todays;
    let par = dateAndTime.format(new Date(), "DD.MM.YYYY");

    // setInterval(() => {

    try {
        await mongoose.connect(uri);
        db.once('open', async function callback() {
            todays = await Reminder.find({"date": par});

            try {
                for (let rem of todays) {
                    if (rem.time === dateAndTime.format(new Date(), "HH.mm")) {
                        trySend(rem.messengerId, "time to \"" + rem.event + "\"", rem["_id"])
                    }
                }

            } catch (e) {
                trySend("1844369452275489", e);
            }
        });
        // mongoose.Connection.close();

        // new CronJob("1 * * * * *", () => {
        //
        //     try {
        //         for (let rem of todays) {
        //             if (rem.time === dateAndTime.format(new Date(), "HH.mm")) {
        //                 trySend("1844369452275489", "ebat")
        //             }
        //             else if (rem.time === dateAndTime.format(new Date(), "H.mm")) {
        //                 trySend("1844369452275489", "ne ebat")
        //             }
        //         }
        //
        //         // todays.forEach(rem => {
        //         //     if (rem.time === dateAndTime.format(new Date(), "HH.mm")) {
        //         //         trySend("1844369452275489", "ebat")
        //         //     }
        //         // });
        //
        //         // trySend("1844369452275489", "rabotaem");
        //
        //     } catch (e) {
        //         trySend("1844369452275489", e);
        //     }
        //
        // }, null, true)


    }
    catch (e) {
        trySend("1844369452275489", "huinya poluchylas run" + e);
    }
    finally {
        mongoose.Connection.close();
    }
    // }, 30000);


    // mongoose.connect(uri);
    //
    // db.on('error', console.error.bind(console, 'connection error:'));
    //
    // db.once('open', async function callback() {

    // try {
    //     new CronJob("1 * * * * *", async () => {
    //
    //         evarr.forEach(ev => {
    //             if (!ev.running)
    //                 ev.start();
    //         });
    //         // let events = await Event.find();
    //         //
    //         //
    //         // events.forEach(event => {
    //         //     if (!event.running)
    //         //         event.start();
    //         // });
    //
    //         trySend("1844369452275489", "rabotaem");
    //     }, null, true)
    //
    // } catch (e) {
    //     trySend("1844369452275489", "huinya poluchylas");
    // }
    // finally {
    //     mongoose.Connection.close()
    // }

    // });
}

app.get('/checkRems', async (req, res) => {

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
    // finally {
    //
    //     try {
    //         mongoose.Connection.close();
    //     } catch (e) {
    //         trySend("1844369452275489", e + "   in finally");
    //     }
    // }


    // mongoose.connect(uri);
    //
    // db.on('error', console.error.bind(console, 'connection error:'));
    //
    // db.once('open', async function callback() {

    // try {
    //     new CronJob("1 * * * * *", async () => {
    //
    //         evarr.forEach(ev => {
    //             if (!ev.running)
    //                 ev.start();
    //         });
    //         // let events = await Event.find();
    //         //
    //         //
    //         // events.forEach(event => {
    //         //     if (!event.running)
    //         //         event.start();
    //         // });
    //
    //         trySend("1844369452275489", "rabotaem");
    //     }, null, true)
    //
    // } catch (e) {
    //     trySend("1844369452275489", "huinya poluchylas");
    // }
    // finally {
    //     mongoose.Connection.close()
    // }

    // });
});


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


async function deletion(messengerId, remId, res) {

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {

        try {

            if (remId.toUpperCase() === "ALL") {
                await Reminder.remove({"messengerId": messengerId});

                mongoose.connection.close();
                res.send([{"text": "Done all " + remId}]);
            }
            else {
                await Reminder.remove({"messengerId": messengerId, "remId": remId});

                mongoose.connection.close();
                res.send([{"text": "Done " + remId}]);
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