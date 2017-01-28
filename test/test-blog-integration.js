const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// used to put randomish documents in db
// so we have data to work with and assert about.
// we use the Faker library to automatically
// generate placeholder values for author, title, content
// and then we insert that data into mongo
function seedPostData() {
  console.info('seeding blog post data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generatePostData());
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

// generate an object represnting a post.
// can be used to generate seed data for db
// or request.body data
function generatePostData() {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraph(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    }
  }
}


// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure data from one test does not stick
// around for next one
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedRestaurantData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  })

  // note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      // strategy:
      //    1. get back all restaurants returned by by GET request to `/restaurants`
      //    2. prove res has right status, data type
      //    3. prove the number of restaurants we got back is equal to number
      //       in db.
      //
      // need to have access to mutate and access `res` across
      // `.then()` calls below, so declare it here so can modify in place
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          // so subsequent .then blocks can access resp obj.
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          console.log(count)
          res.body.should.have.length.of(count);
        });
    });


    it('should return posts with right fields', function() {
      // Strategy: Get back all posts, and ensure they have expected keys

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys(
              'id', 'title', 'content', 'author');
          });
          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(function(post) {
          resPost.id.should.equal(post.id);
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.equal(`${post.author.firstName} ${post.author.lastName}`.trim());
        });
    });
  });

  // describe('POST endpoint', function() {
  //   // strategy: make a POST request with data,
  //   // then prove that the restaurant we get back has
  //   // right keys, and that `id` is there (which means
  //   // the data was inserted into db)
  //   it('should add a new restaurant', function() {

  //     const newRestaurant = generateRestaurantData();
  //     let mostRecentGrade;

  //     return chai.request(app)
  //       .post('/restaurants')
  //       .send(newRestaurant)
  //       .then(function(res) {
  //         res.should.have.status(201);
  //         res.should.be.json;
  //         res.body.should.be.a('object');
  //         res.body.should.include.keys(
  //           'id', 'name', 'cuisine', 'borough', 'grade', 'address');
  //         res.body.name.should.equal(newRestaurant.name);
  //         // cause Mongo should have created id on insertion
  //         res.body.id.should.not.be.null;
  //         res.body.cuisine.should.equal(newRestaurant.cuisine);
  //         res.body.borough.should.equal(newRestaurant.borough);

  //         mostRecentGrade = newRestaurant.grades.sort(
  //           (a, b) => b.date - a.date)[0].grade;

  //         res.body.grade.should.equal(mostRecentGrade);
  //         return Restaurant.findById(res.body.id);
  //       })
  //       .then(function(restaurant) {
  //         restaurant.name.should.equal(newRestaurant.name);
  //         restaurant.cuisine.should.equal(newRestaurant.cuisine);
  //         restaurant.borough.should.equal(newRestaurant.borough);
  //         restaurant.name.should.equal(newRestaurant.name);
  //         restaurant.grade.should.equal(mostRecentGrade);
  //         restaurant.address.building.should.equal(newRestaurant.address.building);
  //         restaurant.address.street.should.equal(newRestaurant.address.street);
  //         restaurant.address.zipcode.should.equal(newRestaurant.address.zipcode);
  //       });
  //   });
  // });

  describe('POST endpoint', function() {
    // strategy: make a POST request with data,
    // then prove that the restaurant we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new post', function() {
      const newPost = generatePostData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
              'id', 'title', 'content', 'author');
          res.body.title.should.equal(newPost.title);
          res.body.id.should.not.be.null;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`.trim());
          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        })
    });
  });

  // describe('PUT endpoint', function() {

  //   // strategy:
  //   //  1. Get an existing restaurant from db
  //   //  2. Make a PUT request to update that restaurant
  //   //  3. Prove restaurant returned by request contains data we sent
  //   //  4. Prove restaurant in db is correctly updated
  //   it('should update fields you send over', function() {
  //     const updateData = {
  //       name: 'fofofofofofofof',
  //       cuisine: 'futuristic fusion'
  //     };

  //     return Restaurant
  //       .findOne()
  //       .exec()
  //       .then(function(restaurant) {
  //         updateData.id = restaurant.id;

  //         // make request then inspect it to make sure it reflects
  //         // data we sent
  //         return chai.request(app)
  //           .put(`/restaurants/${restaurant.id}`)
  //           .send(updateData);
  //       })
  //       .then(function(res) {
  //         res.should.have.status(204);

  //         return Restaurant.findById(updateData.id).exec();
  //       })
  //       .then(function(restaurant) {
  //         restaurant.name.should.equal(updateData.name);
  //         restaurant.cuisine.should.equal(updateData.cuisine);
  //       });
  //     });
  // });

  // describe('DELETE endpoint', function() {
  //   // strategy:
  //   //  1. get a restaurant
  //   //  2. make a DELETE request for that restaurant's id
  //   //  3. assert that response has right status code
  //   //  4. prove that restaurant with the id doesn't exist in db anymore
  //   it('delete a restaurant by id', function() {

  //     let restaurant;

  //     return Restaurant
  //       .findOne()
  //       .exec()
  //       .then(function(_restaurant) {
  //         restaurant = _restaurant;
  //         return chai.request(app).delete(`/restaurants/${restaurant.id}`);
  //       })
  //       .then(function(res) {
  //         res.should.have.status(204);
  //         return Restaurant.findById(restaurant.id).exec();
  //       })
  //       .then(function(_restaurant) {
  //         // when a variable's value is null, chaining `should`
  //         // doesn't work. so `_restaurant.should.be.null` would raise
  //         // an error. `should.be.null(_restaurant)` is how we can
  //         // make assertions about a null value.
  //         should.not.exist(_restaurant);
  //       });
  //   });
  // });
});
