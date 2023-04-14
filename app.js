//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const axios = require("axios");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const fetch = require('node-fetch');
const pag = require('underscore');




const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.connect("mongodb+srv://admin-vicky:enemini22@cluster0.ujaocbt.mongodb.net/vee", {useNewUrlParser: true});
//mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const postSchema = {
  subject: String,
  message: String,
  recipient: String
};

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },

  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const Post = mongoose.model("Post", postSchema);



app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"]})
);


app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
  });


app.get("/register", function(req, res){
  res.render("register")
});

app.get("/secrets", async function(req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});


app.get ("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    await User.register({ username: username }, password);
    await passport.authenticate("local")(req, res);
    res.redirect("/secrets");
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});


app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = new User({
    username,
    password
  });

  try {
    await new Promise((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await passport.authenticate("local")(req, res);

    res.redirect("/secrets");
  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
});


app.get("/homes", async function(req, res){
  try {
    const posts = await Post.find({});
    res.render("homes", {
      startingContent: homeStartingContent,
      posts: posts
    });
  } catch (err) {
    console.log(err);
    res.send("An error occurred");
  }
});

app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
  console.log('request title : ',req.body.postTitle)
  console.log('request body : ',req.body.postBody)
  console.log('request recipient: ',req.body.postRecipients)


  const post = new Post({
    subject: req.body.postTitle,
    message: req.body.postBody,
    recipient: req.body.postRecipients
  });

  axios.post('https://fathomless-falls-26314.herokuapp.com/api/v1/mail/send', post)
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

  post.save()
    .then(() => {
      res.redirect("/homes");
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/posts/:postId", function(req, res){
  const requestedPostId = req.params.postId;

  Post.findOne({_id: requestedPostId})
    .then((post) => {
      res.render("post", {
        title: post.title,
        content: post.content
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});


app.get('/events', async (req, res) => {
  try {
    const response = await fetch('http://lastes.eba-xcccgp4b.us-east-1.elasticbeanstalk.com/eventlist/');
    const events = await response.json();
    res.render('events', {events,pag });
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong');
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}`);
});
//app.listen(3000, function() {
//console.log("Server started on port 3000");
//});