var express = require("express");
var router = express.Router();
const passport = require("passport");
const localStrategy = require("passport-local");
const userModel = require("./users");
const postModel = require("./posts");
const storyModel = require("./story");
passport.use(new localStrategy(userModel.authenticate()));
const upload = require("./multer");
const utils = require("../utils/utils");
const messageModel = require("./message"); // at top

// GET
router.get("/", function (req, res) {
  res.render("index", { footer: false, error: req.query.error });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false, error: req.flash('error') });
});

router.get("/like/:postid", async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid });
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (post.like.indexOf(user._id) === -1) {
    post.like.push(user._id);
  } else {
    post.like.splice(post.like.indexOf(user._id), 1);
  }
  await post.save();
  res.json(post);
});

router.get("/feed", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  let stories = await storyModel
    .find({ user: { $ne: user._id } })
    .populate("user");

  var uniq = {};
  var filtered = stories.filter((item) => {
    if (!uniq[item.user.id]) {
      uniq[item.user.id] = " ";
      return true;
    } else return false;
  });

  let posts = await postModel.find().populate("user");

  res.render("feed", {
    footer: true,
    user,
    posts,
    stories: filtered,
    dater: utils.formatRelativeTime,
  });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts")
    .populate("saved");
  console.log(user);

  res.render("profile", { footer: true, user });
});

router.get("/profile/:user", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user.username === req.params.user) {
    res.redirect("/profile");
  }

  let userprofile = await userModel
    .findOne({ username: req.params.user })
    .populate("posts");

  res.render("userprofile", { footer: true, userprofile, user });
});

router.get("/follow/:userid", isLoggedIn, async function (req, res) {
  let followKarneWaala = await userModel.findOne({
    username: req.session.passport.user,
  });

  let followHoneWaala = await userModel.findOne({ _id: req.params.userid });

  if (followKarneWaala.following.indexOf(followHoneWaala._id) !== -1) {
    let index = followKarneWaala.following.indexOf(followHoneWaala._id);
    followKarneWaala.following.splice(index, 1);

    let index2 = followHoneWaala.followers.indexOf(followKarneWaala._id);
    followHoneWaala.followers.splice(index2, 1);
  } else {
    followHoneWaala.followers.push(followKarneWaala._id);
    followKarneWaala.following.push(followHoneWaala._id);
  }

  await followHoneWaala.save();
  await followKarneWaala.save();

  res.redirect("back");
});

router.get("/search", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("search", { footer: true, user });
});

router.get("/save/:postid", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user.saved.indexOf(req.params.postid) === -1) {
    user.saved.push(req.params.postid);
  } else {
    var index = user.saved.indexOf(req.params.postid);
    user.saved.splice(index, 1);
  }
  await user.save();
  res.json(user);
});

router.get("/search/:user", isLoggedIn, async function (req, res) {
  const searchTerm = `^${req.params.user}`;
  const regex = new RegExp(searchTerm);

  let users = await userModel.find({ username: { $regex: regex } });

  res.json(users);
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.get("/upload", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true, user });
});

router.post("/update", isLoggedIn, async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("/profile");
  });
});

router.post(
  "/post",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (req.body.category === "post") {
      const post = await postModel.create({
        user: user._id,
        caption: req.body.caption,
        picture: req.file.filename,
      });
      user.posts.push(post._id);
    } else if (req.body.category === "story") {
      let story = await storyModel.create({
        story: req.file.filename,
        user: user._id,
      });
      user.stories.push(story._id);
    } else {
      res.send("tez mat chalo");
    }

    await user.save();
    res.redirect("/feed");
  }
);

router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.picture = req.file.filename;
    await user.save();
    res.redirect("/edit");
  }
);

// POST
router.post("/register", async function (req, res) {
  try {
    const user = new userModel({
      username: req.body.username,
      email: req.body.email,
      name: req.body.name,
    });

    await userModel.register(user, req.body.password);

    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      const duplicateField = Object.keys(err.keyValue)[0];

      if (duplicateField === "username") {
        return res.redirect(
          "/?error=" + encodeURIComponent("Username already taken")
        );
      }

      if (duplicateField === "email") {
        return res.redirect(
          "/login?error=" +
            encodeURIComponent("User already exists, please login")
        );
      }
    }

    console.error("Register error:", err);
    res.redirect(
      "/?error=" +
        encodeURIComponent("Something went wrong or user already exists")
    );
  }
});



// ------------------ 💬 Chat Feature ------------------

// Inbox - Show ALL users (not just messaged ones)
router.get("/inbox", isLoggedIn, async (req, res) => {
  const currentUser = await userModel.findOne({
    username: req.session.passport.user,
  });

  const users = await userModel.find({ _id: { $ne: currentUser._id } });

  const messages = await messageModel
  .find({
    $or: [{ sender: currentUser._id }, { receiver: currentUser._id }],
  })
  .sort("-timestamp")
  .populate("sender", "username name profilePic")
  .populate("receiver", "username name profilePic");

  const recent = {};
  messages.forEach((msg) => {
    const isSender = msg.sender._id.equals(currentUser._id);
    const otherUser = isSender ? msg.receiver : msg.sender;
    const key = otherUser._id.toString();

    if (!recent[key]) {
      recent[key] = {
        user: otherUser,
        lastMsg: msg,
      };
    }
  });

  res.render("inbox", {
    currentUser,
    allUsers: users,
    recentChats: Object.values(recent),
    user: currentUser, 
    footer: true,
  });
});

/*router.get("/inbox", isLoggedIn, async (req, res) => {
  const currentUser = await userModel.findOne({ username: req.session.passport.user });

  // Find unique users you’ve chatted with
  const messages = await messageModel.find({
    $or: [
      { sender: currentUser._id },
      { receiver: currentUser._id },
    ]
  }).populate("sender receiver");

  const chatMap = new Map();
  messages.reverse().forEach(msg => {
    const otherUser = msg.sender._id.equals(currentUser._id) ? msg.receiver : msg.sender;
    if (!chatMap.has(otherUser._id.toString())) {
      chatMap.set(otherUser._id.toString(), { user: otherUser, lastMsg: msg });
    }
  });

  const recentChats = Array.from(chatMap.values());
  res.render("inbox", { recentChats, user: currentUser });
});
*/

// Chat page between two users
router.get("/chat/:userid", isLoggedIn, async (req, res) => {
  const currentUser = await userModel.findOne({
    username: req.session.passport.user,
  });
  const otherUser = await userModel.findById(req.params.userid);

  const messages = await messageModel
    .find({
      $or: [
        { sender: currentUser._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: currentUser._id },
      ],
    })
    .sort({ createdAt: 1 });

  const roomId = [currentUser._id, otherUser._id].sort().join("-");

  res.render("chat", { messages, currentUser, otherUser, roomId });
});

// Send a message
/*router.post("/chat/:userid", isLoggedIn, async (req, res) => {
  const sender = await userModel.findOne({ username: req.session.passport.user });
  const receiver = await userModel.findById(req.params.userid);

  const newMsg = await messageModel.create({
    sender: sender._id,
    receiver: receiver._id,
    text: req.body.text,
  });

  if (!sender.messages) sender.messages = [];
  if (!receiver.messages) receiver.messages = [];
  sender.messages.push(newMsg._id);
  receiver.messages.push(newMsg._id);

  await sender.save();
  await receiver.save();

  res.redirect("/chat/" + req.params.userid);
});

router.post("/chat/:userid", isLoggedIn, async (req, res) => {
  const sender = await userModel.findOne({ username: req.session.passport.user });
  const receiver = await userModel.findById(req.params.userid);

  // 🛑 Prevent messaging yourself
  if (!receiver || receiver._id.equals(sender._id)) {
    return res.redirect("/inbox");
  }

  const newMsg = await messageModel.create({
    sender: sender._id,
    receiver: receiver._id,
    text: req.body.text,
  });

  sender.messages = sender.messages || [];
  receiver.messages = receiver.messages || [];

  sender.messages.push(newMsg._id);
  receiver.messages.push(newMsg._id);

  await sender.save();
  await receiver.save();

  res.redirect("/chat/" + req.params.userid);
});*/

router.post("/chat/:userid", isLoggedIn, async (req, res) => {
  const sender = await userModel.findOne({
    username: req.session.passport.user,
  });
  const receiver = await userModel.findById(req.params.userid);

  const newMsg = await messageModel.create({
    sender: sender._id,
    receiver: receiver._id,
    text: req.body.text,
  });

  sender.messages.push(newMsg._id);
  receiver.messages.push(newMsg._id);
  await sender.save();
  await receiver.save();

  res.redirect("/chat/" + req.params.userid);
});

// end of the chat feacher

/*router.post("/comment/:postid", isLoggedIn, async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid }).populate('comments.user');
  const user = await userModel.findOne({ username: req.session.passport.user });

  const comment = {
    user: user._id,
    text: req.body.text,
    date: new Date(),
  };

  post.comments.push(comment);
  await post.save();

  res.redirect(`/comment/${post._id}`);
});

router.get("/comment/:postid", isLoggedIn, async function (req, res) {
  const post = await postModel
    .findOne({ _id: req.params.postid })
    .populate("user")
    .populate("comments.user");

  res.render("comment", {
    post,
    dater: utils.formatRelativeTime,
  });
});*/

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/feed",
    failureFlash: true,
    failureRedirect: "/login",
    
  }),
  function (req, res) {}
);

router.post('/ajax-login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return res.json({ success: false, message: 'Something went wrong' });
    if (!user) return res.json({ success: false, message: info.message || 'Invalid Credentials' });

    req.logIn(user, function(err) {
      if (err) return res.json({ success: false, message: 'Login failed' });
      return res.json({ success: true });
    });
  })(req, res, next);
});


router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
}); 

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}

module.exports = router;
