const express = require('express');

const router = express.Router();

const reminderController = require('../controllers/reminderController');

router.post('/getRems', reminderController.getReminders);

router.post('/addRem', reminderController.addReminder);

router.post('/delete', reminderController.deleteReminder);

router.post('/acceptOrSnooze', reminderController.acceptOrSnooze);

router.get('/start', reminderController.start);

router.get('/stop', reminderController.stop);

router.get('/', (req, res) => { res.send('deployed'); });

module.exports = router;
