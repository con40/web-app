const express = require("express");
const session = require("express-session");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const { createServer } = require("http");
// 👉 Replace this with express-openid-connect require 👈
const { auth, requiresAuth } = require("express-openid-connect");
const axios = require("axios").default;

const {
  checkUrl,
  APP_URL, // Public URL for this app
  API_URL, // URL for Expenses API
  ISSUER_BASE_URL, // Auth0 Tenant Url
  CLIENT_ID, // Auth0 Web App Client
  CLIENT_SECRET, // Auth0 Web App CLient Secret
  SESSION_SECRET, // Cookie Encryption Key
  PORT,
} = require("./env-config");

const app = express();

app.use(checkUrl()); // Used to normalize URL in Vercel
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//app.use(
//  session({
 //  secret: SESSION_SECRET,
//   authRequired: false,
//  resave: false,
//    saveUninitialized: true,
//  })
//);

// 👉 Replace this with auth middleware 👈

app.use(
 auth({
   secret: SESSION_SECRET,
   authRequired: false,
   auth0Logout: true,
   baseURL: APP_URL,
   // 👇 add this 👇
   authorizationParams: {
     response_type: "code id_token",
     audience: "https://expenses-api",
   },
   // 👆 add this 👆
 })
);


//const expenses = [
 // {
   // date: new Date(),
    //description: "Pizza for a Coding Dojo session.",
    //value: 102,
  //},
  //{
   // date: new Date(),
   // description: "Coffee for a Coding Dojo session.",
   // value: 42,
  //},
//];

app.get("/", async (req, res) => {
 try {
   const summary = await axios.get(`${API_URL}/total`);
   res.render("home", {
     user: req.oidc && req.oidc.user,
     total: summary.data.total,
     count: summary.data.count,
   });
 } catch (err) {
   next(err);
 }
});


// 👇 add requiresAuth middlware to these private routes  👇

app.get("/user", requiresAuth(), async (req, res) => {
  res.render("user", {
    user: req.oidc && req.oidc.user,
    id_token: req.oidc && req.oidc.idToken,
    access_token: req.oidc && req.oidc.accessToken,
    refresh_token: req.oidc && req.oidc.refreshToken,
  });
});

app.get("/expenses", requiresAuth(), async (req, res, next) => {
 try {
   // 👇 get the token from the request 👇
   const { token_type, access_token } = req.oidc.accessToken;
   console.log(token_type);
   // 👇 then send it as an authorization header 👇
   const expenses = await axios.get(`${API_URL}/reports`, {
     headers: {
       Authorization: `${token_type} ${access_token}`,
     },
   });
   // 👆 end of changes 👆
   res.render("expenses", {
     user: req.oidc && req.oidc.user,
     expenses: expenses.data,
   });
 } catch (err) {
   next(err);
 }
});



// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = err;

  // render the error page
  res.status(err.status || 500);
  res.render("error", {
    user: req.oidc && req.oidc.user,
  });
});

createServer(app).listen(PORT, () => {
  console.log(`WEB APP: ${APP_URL}`);
});
