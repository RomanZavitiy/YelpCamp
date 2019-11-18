var express     = require("express"),
    router      = express.Router(),
    Campground  = require("../models/campground"),
    middleware  = require("../middleware");


//INDEX - show all campgrounds
router.get("/", function(req, res){
    // Fuzzy Search
    if (req.query.search) {
        var regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all campgrounds that we are searching
        Campground.find({name: regex}, function(err, allCampgrounds){
            if(err){
                console.log(err);
            } else {
                res.render("campgrounds/index",{campgrounds: allCampgrounds});
            }
        });
    } else {
    // Get all campgrounds from DB
        Campground.find({}, function(err, allCampgrounds){
        if(err){
            console.log(err);
        } else {
            res.render("campgrounds/index",{campgrounds: allCampgrounds});
        }
        });
    }
});

//CREATE - add a new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    //get data from form and add to campgrounds array 
    var name = req.body.name;
    var price = req.body.price;
    var image = req.body.image;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground = {name: name, price: price, image: image, description: desc, author: author}
    //Create new campground and save it to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds");
        }
    });
    
});

//NEW - show from to add a new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", function (req, res){
    //find campfround with provided ID
    Campground.findById(req.params.id).populate("comments likes").exec(function(err, foundCampground){
        if(err){
        console.log(err)
        } else {
            console.log(foundCampground);
            //render show tamplate with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership ,function(req,  res){
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND COUTE
router.put("/:id", middleware.checkCampgroundOwnership , function(req, res){
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
        if (err){
            res.redirect("/campgrounds");
        } else {
            req.flash("success", "Campground info is updated");
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});

// UPDATE CAMPGROUND ROUTE
// router.put("/:id", middleware.checkCampgroundOwnership, function (req, res) {
//     // find and update the correct campground
//     Campground.findById(req.params.id, function (err, campground) {
//         if (err) {
//             console.log(err);
//             res.redirect("/campgrounds");
//         } else {
//             campground.name = req.body.campground.name;
//             campground.description = req.body.campground.description;
//             campground.image = req.body.campground.image;
//             campground.save(function (err) {
//                 if (err) {
//                     console.log(err);
//                     res.redirect("/campgrounds");
//                 } else {
//                     res.redirect("/campgrounds/" + campground._id);
//                 }
//             });
//         }
//     });
// });

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership , function(req, res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if (err){
            res.redirect("/campgrounds");
        } else {
            req.flash("success", "Campground deleted");
            res.redirect("/campgrounds");
        }
    });
});

// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

// part of Fuzzy Search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;