const queries = require('../db/queries');
const express = require('express');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

function isValidId(req, res, next) {
  if (!isNaN(req.params.id)) {
    return next();
  }
  next(new Error("Invalid ID"));
}

function validUser(user) {
  const hasEmail = typeof user.email == "string";
  const hasPass = typeof user.password == "string";
  return hasEmail && hasPass;
}

router.get('/users', (req,res,next) => {
  queries.getAll('user').then(users => {
    res.json(users)
  });
});

router.get('/users/:id', (req,res,next) => {
  queries.getOne('user', req.params.id).then(user => {
    res.json(user)
  });
});

router.get('/beers', (req,res,next) => {
  queries.getAll('beer').then(beers => {
    res.json({"beers": beers});
  });
});

router.get('/beers/on_tap', (req,res) =>{
  queries.getOnTap().then(beer_ids => {
    return beer_ids.reduce((ids, beer) => {
      ids.push(beer.beer_id);
      return ids;
    }, []);
  }).then(beers => {
    queries.getTaps(beers).then((onTap) => {
      res.json({"on tap": onTap})
    })
  });
});

router.put("/beers/on_tap", (req, res) =>{
  // Promise.all(
  //   req.body.map((beer, i) => {
  //     return queries.changeTaps(beer, i+1);
  //   })
  // ).then(() => {
  //   res.json({message: "CJ!"})
  // })
  let taps = Object.keys(req.body);
  let beer_id = Object.values(req.body);
  Promise.all(taps.map((tap, i) => {
    console.log(tap, beer_id[i]);
    return queries.changeTaps(beer_id[i], tap);
  })).then(thing => {
    res.json({"thing": thing});
  }).catch(err => {
    console.log(err);
  });
});

router.get('/beers/:id', (req,res,next) => {
  queries.getOne('beer', req.params.id).then(beer => {
    res.json(beer);
  });
});

router.post("/signup", function(req, res, next) {
  if (validUser(req.body)) {
    queries.getUserByEmail(req.body.email).then((user) => {
      if (!user) {
        bcrypt.genSalt(8, function(err, salt) {
          bcrypt.hash(req.body.password, salt, function(err, hash) {
            const user = {
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              email: req.body.email,
              password: hash,
              campus: req.body.campus,
              is_admin: req.body.is_admin
            };
            queries.create("user", user).then((user) => {
              jwt.sign({
                id: user[0].id
              }, process.env.TOKEN_SECRET, {
                expiresIn: "4w"
              }, (err, token) => {
                console.log("err", err);
                console.log("token", token);
                res.json({
                  id: user[0].id,
                  token,
                  message: "ok"
                });
              });
            });
          });
        });
      } else {
        next(new Error("Email already in use"));
      }
    });
  } else {
    next(new Error("Invalid User"));
  }
});

router.post("/login", function(req, res, next) {
  if (validUser(req.body)) {
    queries.getUserByEmail(req.body.email).then((user) => {
      if (user) {
        bcrypt.compare(req.body.password, user.password).then((match) => {
          if (match) {
            jwt.sign({
              id: user.id
            }, process.env.TOKEN_SECRET, {
              expiresIn: "1h"
            }, (err, token) => {
              console.log("err", err);
              console.log("token", token);
              res.json({
                id: user.id,
                token,
                message: "logged in"
              });
            });
          } else {
            next(new Error("Invalid Login"));
          }
        });
      } else {
        next(new Error("Invalid Login"));
      }
    });
  } else {
    next(new Error("Invalid Login"));
  }
});

router.post("/beers", (req, res) => {
  queries.create("beer", req.body).then(beer => res.json(beer));
});

module.exports = router;

// router.put
