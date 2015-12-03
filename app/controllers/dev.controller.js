var config = require('../../config/config'),
    fs = require('fs'),
    fstream = require('fstream'),
    Game = require('../models/dev/game'),
    MongoClient = require('mongodb').MongoClient,
    ObjectId = require('mongodb').ObjectID,
    unzip = require('unzip'),
    url = require('url');

exports.createNew = function(req, res) {
  res.render('dev/pages/newGame');
};

exports.readPending = function(req, res) {
  res.render('dev/pages/pending', {
    game: req.game,
    status: 'pending'
  });
};

exports.acceptGame = function(req, res, next) {
  console.log(req.game.files.compressed);
  var game = req.game,
      inputPath = './uploads/games/pending/' + game.files.compressed,
      outputPath = './uploads/games/published/'
          + game.developer + '/'
          + game.sanitizedTitle,
      originalDirectoryName = game.originalFilename.replace(/\..*/, '');

  console.log(game);
  console.log(originalDirectoryName);
  console.log('i', inputPath);
  console.log('o', outputPath);
  // decompress file
  // var readStream = fs.createReadStream(inputPath);
  // var writeStream = fstream.Writer(outputPath);
  //
  // readStream
  //   .pipe(unzip.Parse())
  //   .pipe(writeStream);
  fs.createReadStream(inputPath).pipe(unzip.Extract({ path: outputPath }));
  fs.renameSync(
    outputPath + game.originalFilename.replace(/\..*/, ''),
    outputPath + game.sanitizedTitle
  );

  // insert into real db collection
  MongoClient.connect(config.db, function(err, db) {
    db.collection('games').insert({
      title: game.title,
      description: game.description,
      gamePath: game.developer + '/' + originalDirectoryName + '/',
      config: game.config,
      developer: game.developer,
      startingPoint: game.config.startingPoint
    }, function (err, game) {
        req.game = game;
        db.close();
        res.json({
          status: 'success'
        });
    });
  });

};

var sanitize = function(str) {
  return str.replace(/\s+/, '_')
    .replace(/[^a-zA-Z_]/, '');
};

exports.addNew = function(req, res) {
  console.log(req.file)
  var body = req.body,
      file = req.file,
      filePath = '/' + file.path.replace(/(\.\.\/)*/, ''),
      fileName = file.path.replace(/(.*\/)*/, '');
      sanitizedTitle = sanitize(body.gameTitle.replace(/\..*/, '')),
      sanitizedFileName = sanitize(file.originalname);

  console.log(file)
  MongoClient.connect(config.db, function(err, db) {
    if (err) {
      console.log('error: ' + err);
    }
    // var newGame = new Game(body.gameTitle, 'thoffma7.dev', {
    //   compressed: fileName
    // }, body.description, body.instructions);
    db.collection('pendingGames').insertOne({
      title: body.gameTitle,
      description: body.description,
      config: JSON.parse(body.config),
      sanitizedTitle: sanitizedTitle,
      developer: 'thoffman_dev',
      originalFilename: file.originalname,
      files: {
        compressed: fileName
      }
    });
    db.close();
    res.redirect('/dev/games/pending/' + fileName);
    // res.json({
    //   status: 'success',
    //   destination: '/dev/games/pending/' + fileName
    // });
  });

};

exports.pendingFile = function(req, res) {
  res.download(
    './uploads/games/pending/' + req.game.files.compressed,
    game.sanitizedTitle + '.zip'
  );
};

exports.pendingGameById = function(req, res, next, id) {
  exports.findPendingGame(req, res, next, {'_id': ObjectId(id)});
};

exports.pendingGameByFile = function(req, res, next, id) {
  exports.findPendingGame(req, res, next, {'files.compressed': id});
};

exports.findPendingGame = function(req, res, next, predicate) {
  MongoClient.connect(config.db, function(err, db) {
    try {
      db.collection('pendingGames').findOne(predicate,
        function (err, game) {
          req.game = game;
          db.close();
          next();
      });
    } catch (e) {
      console.log('no pending games!');
      next();
    }
  });

};
