'use strict';

const
    PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN,
    request = require('request'),
    mongoose = require('mongoose'),
    uri = 'mongodb://admin:7447030j@ds237669.mlab.com:37669/moc_chatbot_reminderstask_db',
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); // creates express http server

let db = mongoose.connection;
let Reminder;
let remSchema;

app.use(bodyParser.urlencoded({extended: false}));

remSchema = mongoose.Schema({
    // remId: number,
    messengerId: String,
    date: String,
    time: String,
    event: String
});

Reminder = mongoose.model('rems', remSchema);

// Sets server port and logs message on success
app.listen(process.env.PORT || 5858, () => console.log('webhook is listening'));


app.get("/getRems", function (req, res) {

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    let rty;

    db.once('open', function callback() {

        // let remQuery = Reminder.find({'messengerId': "1898219773585506"});
        //
        // remQuery.exec((err, rems) => {
        //
        //     if (err) return console.log(err);
        //
        //     rems.forEach(rem => {
        //         let date = rem.date;
        //         let time = rem.time;
        //         let event = rem.event;
        //         let message = [];
        //
        //         message.push({"text": "You have an " + event + " at " + date + " " + time});
        //
        //         res.send(message);
        //     });
        //     //     .then(() => {
        //     //
        //     //     mongoose.connection.close();
        //     //
        //     // }).catch(err => {
        //     //     console.log(err)
        //     // });
        //
        // })

        let message = [];

        Reminder.find({'messengerId': "1898219773585506"}).then(rems => {

            let date;
            let time;
            let event;

            rems.forEach(rem => {

                date = rem.date;
                time = rem.time;
                event = rem.event;

                message.push({"text": "Reminder: " + event + " date: " + date + " time: " + time});

            });


            return rems;

        }).then(rems => {

            if (message.length === 0)
                res.send("No reminders");
            else {
                res.send(typeof  rems + " " + rems.length);


                // Reminder.find({'messengerId': "1898219773585506"}, (err, rems) => {
                //     if (err)  console.log(err);
                //     let l = [];
                //     res.send(typeof l + " " + typeof rems);
                // });
            }

            // let c ;

            // Reminder.count({}, (err, count) => {
            //     c = count + 1;
            //
            //     if (message.length === 0)
            //         res.send("No reminders");
            //     else {
            //         res.send(typeof count + " " + count + " " + c);
            //     }
            //
            // });
            //
            // if (message.length === 0)
            //     res.send("No reminders");
            // else res.send("loh " + c);

        }).then(() => {

            mongoose.connection.close();

        }).catch(err => {

            // Log any errors that are thrown in the Promise chain
            console.log(err)
        });
    });
});


app.post("/getRems", (req, res) => {

    let body = req.body;
    let messengerId = body["messenger user id"];

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', function callback() {

        let message = [];

        Reminder.find({'messengerId': messengerId}).then(rems => {

            let date;
            let time;
            let event;

            rems.forEach(rem => {

                date = rem.date;
                time = rem.time;
                event = rem.event;

                message.push({"text": "Reminder: " + event + " date: " + date + " time: " + time});
            })
        }).then(() => {

            if (message.length === 0)
                res.send([{"text": "You have no reminders"}]);
            else res.send(message);

        }).then(() => {
            mongoose.connection.close();
        }).catch(err => {
            // Log any errors that are thrown in the Promise chain
            console.log(err)
        });
    });
});

let qwe;

app.post("/addRem", (req, res) => {

    mongoose.connect(uri);

    db.on('error', console.error.bind(console, 'connection error:'));

    db.once('open', function callback() {

        let body = req.body;

        qwe = body["messenger user id"];

        let rem = new Reminder({
            remId: 5,
            messengerId: body["messenger user id"],
            date: body.date,
            time: body.time,
            event: body.what
        });

        let list = [rem];

        Reminder.insertMany(list).then(() => {

            mongoose.connection.close();

        }).then(() => {
            let text = [];
            text.push({"text": "Done"});
            res.send(text);

        }).catch(err => {

            console.log(err)
        });
    });
});


app.get("/", function (req, res) {
    res.send("Deployed");
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

    // Sends the response message
    callSendAPI(sender_psid, response);

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

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
        "qs": {"access_token": PAGE_ACCESS_TOKEN},
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


