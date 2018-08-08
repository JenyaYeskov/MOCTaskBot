let router = require("./routes/botRoutes");

const express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: false}));

app.listen(process.env.PORT || 58588, () => console.log('webhook is listening'));

app.use(router);

console.dir(router)
