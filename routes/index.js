var express     = require("express"),
    router      = express.Router(),
    passport    = require("passport"),
    User        = require("../models/user"),
    middleware  = require("../middleware"),
    Campground  = require("../models/campground"),
    async       = require("async"),
    nodemailer  = require("nodemailer"),
    crypto      = require("crypto"),
    util = require('util'),
    randomBytes = util.promisify(crypto.randomBytes);

// Root Route 
router.get("/", function(req, res){
    res.render("landing");
});

//Show Register Form
router.get("/register", function(req, res){
    res.render("register", {page: 'register'}); 
 });

//Handle Sign Up Logic
router.post("/register", async (req, res) => {
  try {
      const { username, firstName, lastName, email, avatar, isAdmin } = req.body;
      const newUser = new User({ username, firstName, lastName, email, avatar });
      
      if (isAdmin === "LovesWeed123") {
          newUser.isAdmin = true;
      }

      const user = await User.register(newUser, req.body.password);
      await new Promise((resolve, reject) => {
          passport.authenticate("local")(req, res, function(err) {
              if (err) reject(err);
              else resolve();
          });
      });

      req.flash("success", `Successfully Signed Up! Nice to meet you ${user.username}`);
      res.redirect("/campgrounds");
  } catch (err) {
      console.error(err);
      req.flash("error", err.message);
      res.redirect("register");
  }
});

//Show Login Form
router.get("/login", function(req, res){
    res.render("login", {page: 'login'}); 
 });

//Handle Login Form
router.post("/login", passport.authenticate("local", {
  successRedirect: "/campgrounds",
  failureRedirect: "/login",
  failureFlash: true,
  successFlash: "Welcome to YelpCamp!"
}));

//Logout Route
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("/campgrounds");
});

// Forgot Route
router.get("/forgot", function(req,res){
    res.render("users/forgot");
});

router.post('/forgot', async (req, res, next) => {
  try {
      const buffer = await randomBytes(20);
      const token = buffer.toString('hex');
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
      }

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      const smtpTransport = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
              type: "OAuth2",
              user: 'zavitiy95@gmail.com',
              pass: 'password1'
          }
      });

      const mailOptions = {
          to: user.email,
          from: 'zavitiy95@gmail.com',
          subject: 'Node.js Password Reset',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.
              Please click on the following link, or paste this into your browser to complete the process:
              http://${req.headers.host}/reset/${token}
              If you did not request this, please ignore this email and your password will remain unchanged.`
      };

      await smtpTransport.sendMail(mailOptions);
      console.log('mail sent');
      req.flash('success', `An e-mail has been sent to ${user.email} with further instructions.`);
      res.redirect('/forgot');
  } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred during the password reset process.');
      res.redirect('/forgot');
  }
});
  
router.get('/reset/:token', async (req, res) => {
  try {
      const user = await User.findOne({ 
          resetPasswordToken: req.params.token, 
          resetPasswordExpires: { $gt: Date.now() } 
      });

      if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('/forgot');
      }

      res.render('reset', { token: req.params.token });
  } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred while processing your request.');
      res.redirect('/forgot');
  }
});
  
router.post('/reset/:token', async (req, res) => {
  try {
      const user = await User.findOne({ 
          resetPasswordToken: req.params.token, 
          resetPasswordExpires: { $gt: Date.now() } 
      });

      if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
      }

      if (req.body.password === req.body.confirm) {
          await user.setPassword(req.body.password);
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          await user.save();

          await new Promise((resolve, reject) => {
              req.logIn(user, (err) => {
                  if (err) reject(err);
                  else resolve();
              });
          });

          const smtpTransport = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  type: "OAuth2",
                  user: 'zavitiy95@gmail.com',
                  pass: 'password1'
              }
          });

          const mailOptions = {
              to: user.email,
              from: 'zavitiy95@mail.com',
              subject: 'Your password has been changed',
              text: `Hello,
                  This is a confirmation that the password for your account ${user.email} has just been changed.`
          };

          await smtpTransport.sendMail(mailOptions);
          req.flash('success', 'Success! Your password has been changed.');
          res.redirect('/campgrounds');
      } else {
          req.flash("error", "Passwords do not match.");
          return res.redirect('back');
      }
  } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred while resetting your password.');
      res.redirect('/reset');
  }
});

// User Profile
router.get("/users/:id", async (req, res) => {
  try {
      const foundUser = await User.findById(req.params.id);
      const campgrounds = await Campground.find().where('author.id').equals(foundUser._id);
      res.render("users/show", { user: foundUser, campgrounds: campgrounds });
  } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong.");
      res.redirect("/");
  }
});

module.exports = router;