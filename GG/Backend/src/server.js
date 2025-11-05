import express from "express";
import configViewEngine from "./config/viewEngine.js";
import initWebRoute from './route/web.js';
import initAPIRoute from './route/api.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
const port = process.env.PORT || 8080;

//Take data from users
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


configViewEngine(app);
//init web route


initWebRoute(app);
//init API route
initAPIRoute(app);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})