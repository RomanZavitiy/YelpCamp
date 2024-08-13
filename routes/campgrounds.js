var express     = require("express"),
    router      = express.Router(),
    Campground  = require("../models/campground"),
    middleware  = require("../middleware");


//INDEX - show all campgrounds
router.get("/", async (req, res) => {
    try {
        let allCampgrounds;
        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), 'gi');
            allCampgrounds = await Campground.find({name: regex});
        } else {
            allCampgrounds = await Campground.find({});
        }
        res.render("campgrounds/index", {campgrounds: allCampgrounds});
    } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred while fetching campgrounds");
        res.redirect("/");
    }
});

//CREATE - add a new campground to DB
router.post("/", middleware.isLoggedIn, async (req, res) => {
    try {
        const { name, price, image, description } = req.body;
        const author = {
            id: req.user._id,
            username: req.user.username
        };
        const newCampground = { name, price, image, description, author };
        await Campground.create(newCampground);
        req.flash("success", "Campground created successfully");
        res.redirect("/campgrounds");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error creating campground");
        res.redirect("/campgrounds");
    }
});

//NEW - show from to add a new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
});

//SHOW - shows more info about one campground
router.get("/:id", async (req, res) => {
    try {
        const foundCampground = await Campground.findById(req.params.id).populate("comments likes");
        res.render("campgrounds/show", {campground: foundCampground});
    } catch (err) {
        console.error(err);
        req.flash("error", "Campground not found");
        res.redirect("/campgrounds");
    }
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, async (req, res) => {
    try {
        const foundCampground = await Campground.findById(req.params.id);
        res.render("campgrounds/edit", {campground: foundCampground});
    } catch (err) {
        console.error(err);
        req.flash("error", "Error fetching campground for editing");
        res.redirect("/campgrounds");
    }
});

// UPDATE CAMPGROUND COUTE
router.put("/:id", middleware.checkCampgroundOwnership, async (req, res) => {
    try {
        const updatedCampground = await Campground.findByIdAndUpdate(req.params.id, req.body.campground, {new: true});
        req.flash("success", "Campground info is updated");
        res.redirect(`/campgrounds/${updatedCampground._id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error updating campground");
        res.redirect("/campgrounds");
    }
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, async (req, res) => {
    try {
        await Campground.findByIdAndDelete(req.params.id);
        req.flash("success", "Campground deleted");
        res.redirect("/campgrounds");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting campground");
        res.redirect("/campgrounds");
    }
});

// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, async (req, res) => {
    try {
        const foundCampground = await Campground.findById(req.params.id);
        const foundUserLike = foundCampground.likes.some(like => like.equals(req.user._id));

        if (foundUserLike) {
            foundCampground.likes.pull(req.user._id);
        } else {
            foundCampground.likes.push(req.user);
        }

        await foundCampground.save();
        res.redirect(`/campgrounds/${foundCampground._id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error processing like");
        res.redirect("/campgrounds");
    }
});

// part of Fuzzy Search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;