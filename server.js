import pg from "pg";
import express from "express";
import joi from "joi";

const { Pool } = pg;

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
  });


const app = express();
app.use(express.json());

// Getting all categories and posting new ones
app.get("/categories", async (req,res)=>{
    try{
        const categories = await connection.query('SELECT * FROM categories');
        res.send(categories.rows)
    }catch{
        res.sendStatus(400)
    }
});

app.post("/categories", async (req,res)=>{
    const categoryName= req.body.name;
    try{
        const NewCategory= await connection.query('INSERT INTO categories (name) values ($1)',[categoryName])
        res.sendStatus(201)
    }catch(err){
        console.log(err);
        res.sendStatus(400);
    }
})

// Getting all games informations and registering new ones
app.get("/games", async (req,res)=>{
    try{
        const games = await connection.query(`SELECT name, image, "stockTotal", "categoryId","pricePerDay",(SELECT name FROM categories where id="categoryId") as "categoryName" FROM games`);
        res.send(games.rows)
    }catch{
        res.sendStatus(400)
    }
})

app.post("/games", async (req,res)=>{
    const {name, image, stockTotal, categoryId,pricePerDay}= req.body;

    try{
        const NewGame= await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId","pricePerDay") values ($1,$2,$3,$4,$5)',[name, image, stockTotal, categoryId,pricePerDay])
        res.sendStatus(201)
    }catch(err){
        console.log(err);
        res.sendStatus(400);
    }
})

app.listen(4000, () => {
    console.log('Server listening on port 4000.');
  });