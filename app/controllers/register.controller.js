var User = require('../models/users/user'),
  MongoClient = require('mongodb').MongoClient,
  ObjectId = require('mongodb').ObjectID,
  crypto = require('crypto'),
  database = require('../../config/config').db,
  success = 0,
  invalidUsername = 1,
  invalidPassword = 2,
  userExists = 3,
  insertError = 4;

exports.begin = function(req, res) {
  res.render('register/pages/register-home', {
    values: User.vals
  });
};

exports.hashAndSalt = function(rawPassword, salt) {
  return crypto
      .createHash('sha1')
      .update(rawPassword + salt)
      .digest('hex');
};

exports.login = function(req, res) {
  exports.getUser(req.body.username, req.body.password, function(err, user) {
    switch (err) {
      case invalidUsername:
        res.send('That username doesn\'t exist');
        break;
      case invalidPassword:
        res.send('That\'s not your password!');
        break;
      case success:
        req.session.user = user;
        res.send('success');
    }
  });
};

exports.getUser = function(username, password, callback) {
  MongoClient.connect(database, function(err, db) {
    try {
      db.collection('users').findOne({
          username: username
        },
        function (err, doc) {
          if (!doc) {
            callback(invalidUsername);
          } else {

            var hashed = exports.hashAndSalt(password, doc.salt);
            if (hashed !== doc.password) {
              callback(invalidPassword);
            } else {
              callback(success, doc);
            }
          }
          db.close();
      });
    } catch (e) {
      res.render('common/pages/index');
    }
  });
};



exports.auth = function(req, res) {
  // var lookup = login(req.cookies['username'], req.cookies['password']);
  var lookup = login(req.body['username'], req.body['password']);
  console.log(lookup);
  res.end(lookup);
  // res.render('register/pages/register-home', {
  //   values: [req.body['username'], req.body['password']]
  // });
};

exports.findById = function(id, callback) {
  MongoClient.connect(database, function(err, db) {
    db.collection('users').findOne({_id: ObjectId(id)}, function(err, user) {
      db.close();
      callback(err, user);
    });
  });
};

exports.register = function(user, callback) {
  user.salt = crypto.randomBytes(16);
  user.password = exports.hashAndSalt(user.password, user.salt);

  MongoClient.connect(database, function(err, db) {
    try {
      db.collection('users').insertOne(user,
        function (err, result) {
          db.close();
          if(result === null) {
            callback(insertError);
          } else {
            var user = new User.fromMongo(result.ops[0]);
            callback(success, user);
          }
      });
    } catch (e) {
      console.log('Couldn\'t create user ' + userName);

    }
  });
};

exports.create = function(req, res) {
  exports.register(req.body, function(err, user) {
    if (err) {
      res.send('failed to create new user!');
    } else {
      req.session.user = user;
      res.render('common/pages/index');
    }
  });
};

exports.logout = function(req, res) {
  req.session.user = undefined;
  res.render('common/pages/index');
};
