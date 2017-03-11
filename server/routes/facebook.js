/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();

/* GET api listing. */
router.get('', (req, res) => {
    res.status(200).json("Perfect");
});

module.exports = router;
