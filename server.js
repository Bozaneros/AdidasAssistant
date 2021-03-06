/**
 * Created by alejandro on 11/03/17.
 */
/**
 * Created by alejandro on 3/03/17.
 */

// Get dependencies
const config = require('./server/config/config.json');
const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
var cors = require('cors');
var mongoose = require('mongoose');

// Get our API routes
const api = '/api';
const root = require('./server/routes/root');
const register = require('./server/routes/register');
//const bot = require('./server/routes/bot');
const facebook = require('./server/routes/facebook');
const shoe = require('./server/routes/shoe');
const capture = require('./server/routes/capture');

const app = express();

app.use(cors());
// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Point static path to dist
app.use(express.static(path.join(__dirname, 'dist')));

// Set our api routes
app.use('/webhook', facebook);
app.use(api, shoe);
app.use(api, capture);
app.use(api, register);
app.use(api, root);
//app.use(api, bot);

// Catch all other routes and return the index file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

/**
 * Get port from environment and store in Express.
 */
const port = process.env.PORT || config.port;
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

mongoose.connect(config.database + '/Bozaneros', function(err, res) {
    if(err) {
        console.log('ERROR: connecting to Database. ' + err);
    } else {
        //initBD();
        /* Listen on provided port, on all network interfaces. */
        server.listen(port, () => console.log(`API running on localhost:${port}`));
    }
});
