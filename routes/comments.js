var express     = require("express"),
    router      = express.Router({mergeParams: true}),
    Campground  = require("../models/campground"),
    Comment     = require("../models/comment"),
    middleware  = require("../middleware");

// Comments New
router.get("/new", middleware.isLoggedIn, async (req, res) => {
    try {
        const campground = await Campground.findById(req.params.id);
        res.render("comments/new", { campground });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error fetching campground");
        res.redirect("/campgrounds");
    }
});

// Comments Create
router.post("/", middleware.isLoggedIn, async (req, res) => {
    try {
        const campground = await Campground.findById(req.params.id);
        const comment = await Comment.create(req.body.comment);
        
        comment.author.id = req.user._id;
        comment.author.username = req.user.username;
        await comment.save();
        
        campground.comments.push(comment);
        await campground.save();
        
        req.flash("success", "Successfully added comment");
        res.redirect(`/campgrounds/${campground._id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error creating comment");
        res.redirect("/campgrounds");
    }
});

// COMMENT EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, async (req, res) => {
    try {
        const foundComment = await Comment.findById(req.params.comment_id);
        res.render("comments/edit", { campground_id: req.params.id, comment: foundComment });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error fetching comment");
        res.redirect("back");
    }
});

// COMMENT UPDATE ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, async (req, res) => {
    try {
        await Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment);
        req.flash("success", "Comment updated");
        res.redirect(`/campgrounds/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error updating comment");
        res.redirect("back");
    }
});

// COMMENT DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.comment_id);
        req.flash("success", "Comment deleted");
        res.redirect(`/campgrounds/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting comment");
        res.redirect("back");
    }
});

module.exports = router;