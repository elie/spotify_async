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

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser');
    request = require('request'),
    async = require('async'),
    db = require("./models/index"),
    _ = require('underscore');

var cookieSession = require('cookie-session');
var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;

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

passport.serializeUser(function(user, done) {
    console.log("SERIALIZED JUST RAN")
    done(null, user[0].dataValues.id);
});

passport.deserializeUser(function(id, done) {
    console.log("DESERIALIZED JUST RAN")
    db.User.find({
        where:{
            id:id
        }
    }).done(function(err,user){
        done(err, user);
    });

});

app.use(passport.initialize());
app.use(passport.session());

passport.use(new SpotifyStrategy({
    clientID: process.env.SPOT_ID,
    clientSecret: process.env.SPOT_SECRET,
    callbackURL: "http://localhost:3000/auth/spotify/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    db.User.findOrCreate({where:{
        spotifyId: profile.id
    }
    }).done(function (err, user) {
        return done(err,user);
    });
  }
));

// If you want to do spotify auth.....

app.get('/auth/spotify',
  passport.authenticate('spotify'),
  function(req, res){
  });

app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/home');
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
    var topTracks = [];
    var track = {}
    var finalTracks = [];
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
                // console.log("EVENT")
                // console.log(event)
                artistNames.push(event.performance[0].displayName);
            });
        }
            // this is the callback for async.waterfall (first parameter is if there is an error)
            // console.log(daysEvents)
            callback(null,artistNames);
            });

        },
        function secondCall(artistNames, callback){
            console.log("second call just ran")
            async.each(artistNames, function(name,callback){
            var artistObject = "https://api.spotify.com/v1/search?q=" + name + "&type=artist";
                request(artistObject, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                    var obj2 = JSON.parse(body);
                    artistIds.push(obj2.artists.items[0].id);
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
                callback(null, artistIds, artistNames);
            }
        });
    },
    // we are still missing 5.....
        function thirdCall(artistIds, artistNames, callback){
            var count = 0
            console.log("third call just ran")
            async.each(artistIds,function(id,callback){
              var artistTopTracks = "https://api.spotify.com/v1/artists/" + id + "/top-tracks?country=US";
                request(artistTopTracks, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var result = JSON.parse(body);
                        for (var i = 0; i < daysEvents.length; i++) {
                        if (daysEvents[i].performance[0].displayName === result.tracks[0].artists[0].name) {
                            daysEvents[i].uri = result.tracks[0].uri
                            count++
                        }

                        }

                        callback();
                    }
                });
            },
            function(err){
            if(err){
                console.log("Oops! Something went wrong", err);
            }
            else{
                // this is 18....it should be higher :(
                console.log(count)
              // this is the callback for async.waterfall (first parameter is if there is an error)
                callback(null, daysEvents, topTracks, artistNames);
            }
            })
        },
        ],

        function final(err, daysEvents){
            console.log("final call just ran!")
          res.render("home", {listOfEvents: daysEvents});
        }
    );
    });

app.get('/logout', function(req,res){
    req.logout();
    res.redirect('/');
});


var server = app.listen(3000, function() {
    console.log('Listening on port 3000', server.address().port);
});