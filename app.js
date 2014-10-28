var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser');
    request = require('request'),
    async = require('async'),
    _ = require('underscore');

var cookieSession = require('cookie-session');
var passport = require('passport');
var passportSpotify = require('passport-spotify');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));

app.use(cookieSession( {
  secret: 'secretkey',
  name: 'cookie session',
  maxage: 50000000,
  })
);

passport.use(new SpotifyStrategy({
    clientID: client_id,
    clientSecret: client_secret,
    callbackURL: "http://localhost:8888/auth/spotify/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ spotifyId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

// If you want to do spotify auth.....

app.get('/auth/spotify',
  passport.authenticate('spotify'),
  function(req, res){
    // The request will be redirected to spotify for authentication, so this
    // function will not be called.
  });

app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });


// Home
app.get('/', function(req, res) {
    res.render('index');
});

// app.get('/home', function(req, res) {
//     var artist = "https://api.spotify.com/v1/search?q=shakira&type=artist";
//     res.render('home');
// });

app.get('/home', function(req, res) {
    var daysEvents = [];
    var artistNames = [];
    var artistIds = [];
    var allEvents = "http://api.songkick.com/api/3.0/metro_areas/26330-us-sf-bay-area/calendar.json?apikey=z4nSxDMJEbSNuTKt";

    // what async waterfall does is let us chain functions together
    // and when that functions ends, we call the callback to move onto the next one
    // and we can pass in whatever data we want
    // (thats what our parameter is in all these functions)

    // finally, at the end of the waterfall (where the ] is) - we call one more function
    // which is what takes the data from all our functions
    async.waterfall([
    function firstCall(callback){
        console.log("firstCall just ran!");
             request(allEvents, function(error, response, body) {
        // making sure theres no error and getting a successful 200 back
        if (!error && response.statusCode == 200) {
            var obj = JSON.parse(body);

            var allEvents = obj.resultsPage.results.event;

            daysEvents = _.filter(allEvents, function(event){
                return event.start.date === "2014-10-29" && event.type === "Concert";
            });

            // artist name string from event list
            var artistString = (daysEvents[0].performance[0].displayName);
            // console.log(artistString);


            // trying to get all artist name strings for days events

            daysEvents.forEach(function(event) {
                artistNames.push(event.performance[0].displayName);
            });
        }
            // this is the callback for async.waterfall (first parameter is if there is an error)
            callback(null,artistNames);
            });

        },
        function secondCall(artistNames, callback){
          // what is this async each thing? Good question!
          // this takes in 3 parameters
            // 1 - the array we are looping over
            // 2 - a function with 2 parameters(name, callback)
              // 1 - this is taco (name)
              // 2 - this is what we run when we want to loop again (callback)
            // 3 - another function with 1 parameter in case there are errors
            // this 3rd function is not run until the looping is over
              // that way, we can loop and not have to worry about other functions running
              // before the loop is over
            async.each(artistNames, function(name,callback){
            var artistObject = "https://api.spotify.com/v1/search?q=" + name + "&type=artist";
                request(artistObject, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                    var obj2 = JSON.parse(body);
                    artistIds.push(obj2.artists.items[0].id);
                    // console.log("loop just ran", artistIds);
                    callback();
                    }
                });
            },
        function(err){
            if(err){
                console.log("Oops! Something went wrong", err);
            }
            else{
                // this is the callback for async.waterfall (first parameter is if there is an error)
                callback(null, artistIds);
            }
        });
    },
        function thirdCall(artistIds, callback){
            async.each(artistIds,function(id,callback){
              var artistTopTracks = "https://api.spotify.com/v1/artists/" + id + "/top-tracks?country=US";
                request(artistTopTracks, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var tracks = JSON.parse(body);
                        console.log(tracks);

                    // Do whatever you want to the daysEvents array here
                    // or whatever else you would like...

                        // this is the callback for async.each
                        callback();
                    }
                });
            },
            function(err){
            if(err){
                console.log("Oops! Something went wrong", err);
            }
            else{
              // this is the callback for async.waterfall (first parameter is if there is an error)
                callback(null, daysEvents);
            }
            });

        }],

        function final(err, daysEvents){
          res.render("home", {listOfEvents: daysEvents});
        }
    );
    });


var server = app.listen(3000, function() {
    console.log('Listening on port 3000', server.address().port);
});