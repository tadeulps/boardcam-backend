import pg from "pg";
import express from "express";
import Joi from "joi";

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
    const schema = Joi.object({
        name: Joi.string().required()
    });
    const {error}=schema.validate(req.body);
    if(error){
        res.sendStatus(400); return
    }
    
    const alreadyIn=await connection.query(`SELECT * FROM categories WHERE name=$1`,[categoryName])
    if(alreadyIn.rows.length>0){res.sendStatus(409); return}

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
    const searchName=req.query.name
    try{
        if(searchName){
             const games = await connection.query(`SELECT games.*, categories.name as "categoryName" 
             FROM games 
             JOIN categories ON games."categoryId"=categories.id
             where games.name ILIKE $1`,[searchName+'%'])
             res.send(games.rows)
        }else{
            const games = await connection.query(`SELECT games.*, categories.name as "categoryName" 
            FROM games 
            JOIN categories ON games."categoryId"=categories.id`)
            res.send(games.rows)
        }
    }catch{
        res.sendStatus(400)
    }
})

app.post("/games", async (req,res)=>{
    const {name, image, stockTotal, categoryId,pricePerDay}= req.body;
     const schema = Joi.object({
         name: Joi.string().required(),
         stockTotal: Joi.number().min(1),
         pricePerDay: Joi.number().min(1),
     });
     const {error}=schema.validate({name,stockTotal,pricePerDay});
     if(error){
         res.send(400); return
     }
    const categoryExist= await connection.query(`SELECT * FROM categories WHERE id=$1`,[categoryId]);
    if(categoryExist.rows.length===0){
        res.sendStatus(400); return
    }
    const gameExist= await connection.query(`SELECT * FROM games WHERE name=$1`,[name]);
    if(gameExist.rows.length>0){
        res.sendStatus(409); return
    }

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