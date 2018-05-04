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

            trySend(messengerId);
            handleMessage(messengerId, {"text": "loh"});


            if (message.length === 0)
                res.send([{"text": "You have no reminders"}]);
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


function validateAndSetDate(timeAndDateString) {
    //TODO: do function
}

function fireReminder(reminderId) {
//    TODO: do things
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
            let timeAndDateString = body.date + " " + body.time;

            await Reminder.create(rem);

            // if (validateDate(timeAndDateString))
            timeAndDate = validateAndSetDate(timeAndDateString);

            //TODO: get reminder id from DB

            let qwe = await Reminder.findOne({"messengerId": messengerId, "remId": userReminderId});
            console.log(qwe);

            let reminderId = qwe["_id"];
            console.log("reminderId[\"$oid\"]: " + reminderId["$oid"] + "\ntypeof qwe[\"remId\"]: " + typeof qwe["remId"] +
                "\nreminderId[\"oid\"]: " + reminderId["oid"] + "\nqwe._id[\"$oid\"]: " + qwe._id["$oid"] +
                "\nreminderId: " + reminderId + "\ntypeof reminderId: " + typeof reminderId +
                "{}: "  +       {reminderId}     );

            schedule.scheduleJob(timeAndDate, (reminderId) => {
                fireReminder(reminderId)
            });

            mongoose.connection.close();

            res.send([{"text": "Done " + userReminderId}]);
        }
        catch (e) {
            console.error(e);
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

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', async function callback() {

        try {
            let body = req.body;
            let messengerId = body["messenger user id"];
            let remId = body.remId;

            if (!(remId.toUpperCase() === "ALL")) {

                await Reminder.remove({"messengerId": messengerId, "remId": remId});

                mongoose.connection.close();
                res.send([{"text": "Done " + remId}]);
            }
            else {
                await Reminder.remove({"messengerId": messengerId});

                mongoose.connection.close();
                res.send([{"text": "Done all " + remId}]);
            }
        }
        catch (e) {
            console.error(e);
            mongoose.connection.close();
        }
    })
});

// app.post("/delete", (req, res) => {
//
//     mongoose.connect(uri);
//
//     db.on('error', console.error.bind(console, 'connection error:'));
//
//     db.once('open', function callback() {
//         let body = req.body;
//         let messengerId = body["messenger user id"];
//         let remId = body.remId;
//
//         if (!(remId.toUpperCase() === "ALL")) {
//             Reminder.remove({"messengerId": messengerId, "remId": remId}).then(() => {
//                 mongoose.connection.close();
//                 res.send([{"text": "Done " + remId}]);
//
//             }).catch(err => {
//                 console.log(err)
//             });
//         }
//         else {
//             Reminder.remove({"messengerId": messengerId}).then(() => {
//                 mongoose.connection.close();
//                 res.send([{"text": "Done all " + remId}]);
//
//             }).catch(err => {
//                 console.log(err)
//             });
//         }
//     })
// });

app.get("/", function (req, res) {
    res.send("deployed");
});


app.get("/loh", (req, res) => {
    let body = req.body;
    let messengerId = body["messenger user id"];

    handleMessage(messengerId, {"text": "loshara"})
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

function trySend(mid) {
    let token = "qwYLsCSz8hk4ytd6CPKP4C0oalstMnGdpDjF8YFHPHCieKNc0AfrnjVs91fGuH74";

    request({
        "uri": "https://api.chatfuel.com/bots/5ac8230ce4b0336c50287a5d/users/" + mid + "/send?chatfuel_token=" + token + "&chatfuel_block_id=5ae34ee1e4b088ff003688cf&what=loh",
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