const mongoose = require('mongoose');
const plm = require("passport-local-mongoose");

// Connect to DB
mongoose.connect("mongodb://127.0.0.1:27017/instainsta");

// Define user schema
const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
   profilePic: {
     type: String, 
     default: "/images/default.jpg" },

  password: String, 
  // Passport-local-mongoose handles hashing
  picture: {
    type: String,
    default: "def.png"
  },
  contact: String,
  bio: String,

  stories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "story"
    }
  ],

  saved: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ],

  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ],

  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }
  ],

  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    }
  ],

  messages: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "message"
  }
],
  // userSchema (in users.js)


});

// Add passport-local-mongoose plugin (adds username, hash, salt fields)
userSchema.plugin(plm, { usernameField: 'username' });

module.exports = mongoose.model("user", userSchema);
