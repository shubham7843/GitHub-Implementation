import express from 'express';
//Template engine used to present data in browser
import session from'express-session';
import axios from 'axios';
//Package used to get details(user profile) from github  
import { Octokit } from "octokit";
//to keep common data
import dotenv from 'dotenv';
dotenv.config({path: './.env'});
//to defined __dirname in ES module scope
import path  from 'path';
import cors from 'cors';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Create a instance of express library
const app = express();
app.use(cors());

//Use middleware in express to get data from request perticularly from post methoid and encode it 
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: 'qwerty-keypad',
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'dist/github-ui/')));

const ui_path = path.join(__dirname, "dist/github-ui/");
app.set('views', ui_path);
app.set('view engine','ejs');

//Prepare server to listen
const PORT  = process.env.PORT || 8081;
app.listen(PORT, '0.0.0.0', (err, res)=>{
    if(err) throw err;
    console.log(`Application running on port http://localhost:${PORT}`);
});

// Octokit.js
// https://github.com/octokit/core.js#readme
var octokit;
var token;
const refreshToken = () =>{
    octokit = new Octokit({
        auth: token || process.env.GITHUB_ACCESS_TOKEN
    });
}
refreshToken();

app.use('/#',(req,res)=>{
    res.sendFile(path.join(__dirname,'/dist/github-ui/index.html'));
})

app.get('/user-profile', async(req, res)=>{
    octokit.request('GET /user', {})
    .then((result)=>{
        // console.log("user-profile : ",result.data)
        res.send(result.data);
    })
    .catch((err)=>{
        res.send({
            statusCode : 500,
            message : err
        });
    });       
});

app.get('/git-repo-list', async(req, res)=>{
    try{
        refreshToken();
        const result = await octokit.request('GET /user/repos',{ type :'all'});
        console.log("git-repo-list : ",result)
        res.send(result.data);
    }catch(err){
        res.send({
            statusCode : 500,
            message : err
        });
    }
});

app.get('/git-repo-detail/:owner?/:repo_name?', async(req,res)=>{
    try{
        const OWNER = req.params.owner;
        const REPO = req.params.repo_name;
        const result = await octokit.request('GET /repos/{owner}/{repo}', {
            owner: OWNER,
            repo: REPO
        });
        await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref=developer', {
            owner: OWNER,
            repo: REPO,
            path: "README.md"
        }).then((data)=>{
            let buff = new Buffer( data.data.content, 'base64');
            let text = buff.toString('ascii');
            result.data.fileContent = text || "";
        }).catch((err)=>{
            result.data.fileContent = err.message;
        });
        
        await axios.get(`https://api.github.com/repos/${OWNER}/${REPO}/contents/`)
        .then((res) => {
            result.data.noOfFiles = res.data.length;           
        }).catch((err) =>  {
            result.data.noOfFiles = 0;
        });
        
        res.send(result.data);
    }catch(err){
        res.send({
            statusCode : 500,
            message : err
        });
    }
});

app.post('/fetch-user-profile', async(req, res)=>{
    try{
        const username = req.body.username;
        token = req.body.accesstoken;
        refreshToken();
        const result = await octokit.request(`GET /users/${username}`, {
            username: username
        });
        
        console.log("fetch-user-profile : ",result.data)
        res.send(result.data);
    }catch(err){
        res.send({
            statusCode : 500,
            message : err
        });
    }   
});
