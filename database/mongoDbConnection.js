//Import the mongoose module
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var config = require('../config');

//Set up default mongoose connection
var mongoDB = config.database;
//mongoose.connect(mongoDB, { auth: { authdb: "admin" }, useMongoClient: true });
const options = {
  reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
  reconnectInterval: 500, // Reconnect every 500ms
  poolSize: 10, // Maintain up to 10 socket connections
  // If not connected, return errors immediately rather than waiting for reconnect
  bufferMaxEntries: 0,
  useNewUrlParser: true 
};

mongoose.connect(mongoDB,options);

//Get the default connection
var db = mongoose.connection;

// CONNECTION EVENTS
// When successfully connected
db.on('connected', function () {
  console.log('Mongoose connection open to ' + mongoDB);
});

// If the connection throws an error
db.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
db.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function () {
  db.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
}); 
