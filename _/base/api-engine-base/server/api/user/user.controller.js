'use strict';

var User = require('./user.model');
var passport = require('passport');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');

var errorHandler = function(res, err) {
    return res.status(500).json(err);
};

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
    User.find({}, '-salt -hashedPassword', function(err, users) {
        if (err) return res.status(500).send(err);
        res.status(200).json(users);
    });
};

/**
 * Creates a new user
 */
exports.create = function(req, res, next) {
    var newUser = req.body;
    newUser.provider = 'local';
    newUser.role = 'user';
    console.log(newUser);
    User.create(newUser, function(err, user) {
        if (err) return errorHandler(res, err);
        var token = jwt.sign({ _id: user._id }, config.secrets.session, {
            expiresIn: 60 * 60 * 24
        });
        newUser.__v = undefined;
        newUser.provider = undefined;
        newUser.hashedPassword = undefined;
        newUser.salt = undefined;
        res.json({ user: newUser, token: token });
    });
};

/**
 * Get a single user
 */
exports.show = function(req, res, next) {
    var userId = req.params.id;

    User.findById(userId, function(err, user) {
        if (err) return next(err);
        if (!user) return res.status(401).send('Unauthorized');
        res.json(user.profile);
    });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function(req, res) {
    User.findByIdAndRemove(req.params.id, function(err, user) {
        if (err) return res.status(500).send(err);
        return res.status(204).send('No Content');
    });
};

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
    var userId = req.user._id;
    var oldPass = String(req.body.oldPassword);
    var newPass = String(req.body.newPassword);

    User.findById(userId, function(err, user) {
        if (user.authenticate(oldPass)) {
            user.password = newPass;
            user.save(function(err) {
                if (err) return errorHandler(res, err);
                res.status(200).send('OK');
            });
        } else {
            res.status(403).send('Forbidden');
        }
    });
};

/**
 * Get my info
 */
exports.me = function(req, res, next) {
    var userId = req.user._id;
    User.findOne({
        _id: userId
    }, '-salt -hashedPassword', function(err, user) { // don't ever give out the password or salt
        if (err) return next(err);
        if (!user) return res.status(401).send('Unauthorized');
        res.json(user);
    });
};

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
    res.redirect('/');
};
