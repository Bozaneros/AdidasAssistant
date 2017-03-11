/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');

/* GET api listing. */
router.get('', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === config.verify_token) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

module.exports = router;
