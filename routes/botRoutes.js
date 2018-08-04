let express = require("express");
let router = express.Router();

let reminderController = require("../controllers/reminderController");

router.post("/getRems", reminderController.getReminders);

router.post("/addRem", reminderController.addReminder);

router.post("/delete", reminderController.deleteReminder);

router.post("/acceptOrSnooze", reminderController.acceptOrSnooze);

router.get("/loh", reminderController.loh);

router.get("/", (req, res) => {res.send("deployed")});

module.exports = router;