const http = require("http");
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
const portNumber = 5000;
require("dotenv").config({path: path.resolve(__dirname, './confidential/.env')})
const userName = process.env.MONGO_DB_USERNAME
const password = process.env.MONGO_DB_PASSWORD
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const {MongoClient, ServerApiVersion} = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.opkiwoh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "public/templates"));
app.set("view engine", "ejs");

app.get("/", (request, response) => { 
    response.render("index");
}); 

app.post("/profile", async (request, response) => { 
    let user = {
        firstname: request.body.firstname,
        lastname: request.body.lastname,
        gender: "Male",
        ethnicity: "American",
        age: 18,
        quote: "To be, or not to be, that is the question.",
        avatar: 'https://avatars.dicebear.com/api/adventurer-neutral/' + request.body.firstname + '.svg'
    }

    const diversityQuery = {
        method: 'GET',
        url: 'https://api.diversitydata.io/?fullname=' + user.firstname + ' ' + user.lastname
    }

    const ageQuery = {
        method: 'GET',
        url: 'https://api.agify.io?name=' + user.firstname
    }
    const quoteQuery = {
        method: 'GET',
        url: 'https://zenquotes.io/api/quotes/',
    }

    try {
        let res1 = await axios.request(diversityQuery)
        user.gender = res1.data.gender
        user.ethnicity = res1.data.ethnicity
    } catch (err) {
        user.gender = "Male"
        user.ethnicity = "American"
    }

    try {
        let res2 = await axios.request(ageQuery)
        user.age = res2.data.age
    } catch (err) {
        user.age = 18
    }

    try {
        let res3 = await axios.request(quoteQuery);
        user.quote = res3.data[0].q; 
    } catch (err) {
        user.quote = "To be, or not to be, that is the question."
    }
    
    await insertUser(client, databaseAndCollection, user)
    response.render("profile", user);
}); 

app.get("/search", (request, response) => { 
    response.render("search");
}); 

app.post("/searchUser", async(request, response) => {
    let user = {
        firstname: request.body.firstname,
        lastname: request.body.lastname
    }

    let result = await lookUpUser(client, databaseAndCollection, user)
    user.quote = result.quote
    user.ethnicity = result.ethnicity
    user.gender = result.gender
    user.avatar = result.avatar
    user.age = result.age
    response.render("profile", user);
})


async function insertUser(client, databaseAndCollection, newUser) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newUser);
}

async function lookUpUser(client, databaseAndCollection, user) {
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(user);
   if (result) {
       return result
   } else {
       return null
   }
}

process.stdin.setEncoding("utf8");
if (process.argv.length == 2) {
    app.listen(portNumber);
    process.stdout.write("Stop to shutdown the server: ")
    process.stdin.on("readable", function () {
        let dataInput = process.stdin.read();
        if (dataInput !== null) {
            let command = dataInput.trim();
            if (command === "stop") {
                process.stdout.write("Shutting down the server\n");
                client.close();
                process.exit(0);
            }
          }
    });
}