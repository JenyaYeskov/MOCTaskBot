/* eslint-disable one-var */
const router = require('./routes/botRoutes');

const express = require('express');
const bodyParser = require('body-parser');

const app = express().use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.listen(process.env.PORT || 58588, () => console.log('webhook is listening'));

app.use(router);
