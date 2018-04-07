let express = require('express');
let app = express();

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.get('/*', function(req, res) {
    let jsonResponse = [];
    jsonResponse.push({ "text": "Hi. " + (Math.random() * 5 + 1).toFixed(0) + " is a lucky number..." });
    res.send(jsonResponse);
});