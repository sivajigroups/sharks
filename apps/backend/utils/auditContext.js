// utils/auditContext.js
const { AsyncLocalStorage } = require("async_hooks");

const als = new AsyncLocalStorage();

function startRequestContext(req, res, next) {
  als.run({}, () => next());
}

function setCurrentUser(user, req) {
  const store = als.getStore();
  if (store) {
    store.user = user;
    store.method = req.method;
    store.route = req.originalUrl;
    store.ip = req.ip;
  }
}

function getCurrentUser() {
  return als.getStore() || {};
}

module.exports = { startRequestContext, setCurrentUser, getCurrentUser };
