import pg from "pg";
import express from "express";
import Joi from "joi";
import dayjs from "dayjs"
pg.types.setTypeParser(1082, (str) => str);
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

//Geting all customers infos, searching them by id, registering a new customer and updating informations
app.get("/customers", async(req,res)=>{
    const searchCpf=req.query.cpf;
    try{
        if(searchCpf){
            const customers= await connection.query(`SELECT * FROM customers
            WHERE cpf ILIKE $1`,[searchCpf+'%']);
            res.send(customers.rows);
        }else{
            const customers= await connection.query(`SELECT * FROM customers`);
            res.send(customers.rows);
        }
    }catch{
        res.sendStatus(400);
    }
});

app.get("/customers/:id", async(req,res)=>{
    const id=req.params.id;
    try{
        const customer=await connection.query(`select * from customers where id=$1`,[id])
        if(customer.rows.length>0){
            res.send(customer.rows)
        }else{
            res.sendStatus(404)
        }
    }catch{
        res.sendStatus(404)
    }
})

app.post("/customers",async(req,res)=>{
    const {name,phone,cpf,birthday}=req.body;
    const schema=Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/),
        cpf: Joi.string().pattern(/^[0-9]{11}$/),
        birthday:Joi.date(),
    });
    const {error}=schema.validate({name,phone,cpf,birthday});
    if(error){
        res.sendStatus(400);return
    }

    const cpfExist= await connection.query(`SELECT * FROM customers 
    WHERE cpf=$1`,[cpf])
    if(cpfExist.rows.length>0){
        res.sendStatus(409); return
    }
    try{
        const newCustomers= await connection.query(`INSERT INTO customers (name,phone,cpf,birthday) VALUES ($1,$2,$3,$4)`,[name,phone,cpf,birthday])
        res.sendStatus(201)
    }catch{
        res.sendStatus(400)
    }
})

app.put("/customers/:id", async(req,res)=>{
    const {name,phone,cpf,birthday}=req.body;
    const id=req.params.id;
    const schema=Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().pattern(/^[0-9]{10,11}$/),
        cpf: Joi.string().pattern(/^[0-9]{11}$/),
        birthday:Joi.date(),
    });
    const {error}=schema.validate({name,phone,cpf,birthday});
    if(error){
        res.sendStatus(400);return
    }
    try{
        const cpfExist= await connection.query(`SELECT * FROM customers 
        WHERE cpf=$1`,[cpf])
        if(cpfExist.rows.length>0 && cpfExist.rows[0].id!=id){
            res.sendStatus(409); return
        }
        const changes= await connection.query(`UPDATE customers 
        SET name=$1,phone=$2,cpf=$3,birthday=$4
        WHERE id=$5`,[name,phone,cpf,birthday,id]);
        res.sendStatus(200);
    }catch(err){
        res.sendStatus(err);
    }
})
// All rentals, registering, updating and deleting
app.get("/rentals",async(req,res)=>{
    const customerId=req.query.customerId
    const gameId=req.query.gameId
    try{
        if(customerId){
            const rentals=await connection.query(`SELECT rentals.*, 
        jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
        jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game
        FROM rentals 
        JOIN customers ON rentals."customerId" = customers.id
        JOIN games ON rentals."gameId" = games.id
        JOIN categories ON categories.id = games."categoryId"
        WHERE rentals."customerId"=$1`,[customerId])
        res.send(rentals.rows);
        }else if(gameId){
            const rentals=await connection.query(`SELECT rentals.*, 
        jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
        jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game
        FROM rentals 
        JOIN customers ON rentals."customerId" = customers.id
        JOIN games ON rentals."gameId" = games.id
        JOIN categories ON categories.id = games."categoryId"
        WHERE rentals."gameId"=$1`,[gameId])
        res.send(rentals.rows);
        }else{
        const rentals=await connection.query(`SELECT rentals.*, 
        jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
        jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game
        FROM rentals 
        JOIN customers ON rentals."customerId" = customers.id
        JOIN games ON rentals."gameId" = games.id
        JOIN categories ON categories.id = games."categoryId"`)
        res.send(rentals.rows);}
        
    }catch{
        res.sendStatus(400);
    }
})

app.post("/rentals",async(req,res)=>{
    const {customerId,gameId,daysRented}=req.body;
    const rentDate=dayjs().format('YYYY-MM-DD');
    try{
        const customerExist=await connection.query(`SELECT * FROM customers WHERE id=$1`,[customerId]);
        const gameExist=await connection.query(`SELECT * FROM games WHERE id=$1`,[gameId]);
        const gamesRented= await connection.query(`SELECT * FROM rentals WHERE rentals."gameId"=$1 AND rentals."returnDate" IS null`,[gameId]);
        const stock=await connection.query(`SELECT "stockTotal" FROM games WHERE id=$1`,[gameId])
        if(customerExist.rows.length===0 || gameExist.rows.length===0 || daysRented<1 || gamesRented.rows.length>=stock.rows[0].stockTotal){
            res.sendStatus(400);return}
        const gameInfo= await connection.query(`SELECT "pricePerDay" from games where id=$1`,[gameId])
        const originalPrice=daysRented*gameInfo.rows[0].pricePerDay
        const newRental= await connection.query(`INSERT INTO rentals 
        ("customerId","gameId","rentDate","daysRented","returnDate","originalPrice","delayFee")
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [customerId,gameId,rentDate,daysRented,null,originalPrice,null])
        res.sendStatus(200)
    }catch(err){
        res.sendStatus(400)
    }
});
app.post("/rentals/:id/return",async(req,res)=>{
    const id=req.params.id;
    const returnDate=dayjs().format('YYYY-MM-DD')
    try{
        const rentDateRaw=await connection.query(`SELECT * FROM rentals where id=$1`,[id]);
        const rentDate=dayjs(rentDateRaw.rows[0].rentDate)
        const daysDifference=dayjs().diff(rentDate, 'day')
        const delayFee=(daysDifference-rentDateRaw.rows[0].daysRented)*(rentDateRaw.rows[0].originalPrice/rentDateRaw.rows[0].daysRented)
        const changeDate=await connection.query(`UPDATE rentals SET "returnDate"=$1,"delayFee"=$2 
        WHERE id=$3`,[returnDate,delayFee>0?delayFee:0,id])
        res.sendStatus(200)
    }catch(err){
        res.sendStatus(400)
    }
})

app.delete("/rentals/:id",async(req,res)=>{
    const id=req.params.id;
    try{
        const rentalExist=await connection.query(`SELECT * FROM rentals WHERE id=$1`,[id]);
        if(rentalExist.rows.length===0){
            res.sendStatus(404);return
        }
        const deleting=await connection.query(`DELETE FROM rentals WHERE id=$1`,[id]);
        res.sendStatus(200)
    }catch{
        res.sendStatus(400)
    }
})

app.listen(4000, () => {
    console.log('Server listening on port 4000.');
  });