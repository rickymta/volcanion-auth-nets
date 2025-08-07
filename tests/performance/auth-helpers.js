const crypto = require('crypto');

// Pre-created test users for login scenarios
const testUsers = [
  { email: 'loadtest1@example.com', password: 'TestPassword123!' },
  { email: 'loadtest2@example.com', password: 'TestPassword123!' },
  { email: 'loadtest3@example.com', password: 'TestPassword123!' },
  { email: 'loadtest4@example.com', password: 'TestPassword123!' },
  { email: 'loadtest5@example.com', password: 'TestPassword123!' },
];

module.exports = {
  setCredentials: setCredentials,
  generateRandomString: generateRandomString,
  createTestUser: createTestUser
};

function setCredentials(requestParams, context, ee, next) {
  // Select a random test user for login scenarios
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  context.vars.email = user.email;
  context.vars.password = user.password;
  return next();
}

function generateRandomString(requestParams, context, ee, next) {
  context.vars.randomString = crypto.randomBytes(8).toString('hex');
  return next();
}

function createTestUser(requestParams, context, ee, next) {
  const randomId = crypto.randomBytes(4).toString('hex');
  context.vars.username = `loadtest_${randomId}`;
  context.vars.email = `loadtest_${randomId}@example.com`;
  context.vars.password = 'TestPassword123!';
  context.vars.firstName = 'Load';
  context.vars.lastName = 'Test';
  return next();
}
