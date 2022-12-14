const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const cors = require('cors');
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vfwpldl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'forbiden access' })
        }
        req.decoded = decoded
        next()
    })

}


async function run() {

    try {
        const categoryCollection = client.db('useProduct').collection('categoryNames')

        const laptopCollection = client.db('useProduct').collection('laptops')

        const orderCollection = client.db('useProduct').collection('bookings')
//  bookingsCollection
        const usersCollection = client.db('useProduct').collection('users')

        const addProductCollection = client.db('useProduct').collection('sellerProduct')

        const paymentsCollection = client.db('useProduct').collection('payments')

        const adminReportCollection = client.db('useProduct').collection('reports')
         
        const verifySeller = async(req, res, next) =>{
            const decodedEmail = req.decoded.email
            const query = {email: decodedEmail}
            const user = await usersCollection.findOne(query)
            if(user?.role !== 'Seller'){
                return res.status(403).send({message: 'forbiden access'})
            }
            next()
        }


        app.get('/categoryNames', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/laptops', async (req, res) => {
            const query = {}
            const result = await laptopCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/laptops/:id', async (req, res) => {
            const id = req.params.id
            const data = { _id: ObjectId(id) }
            const result = await laptopCollection.findOne(data)
            res.send(result)

        })

        app.get('/category/:id', async (req, res) => {
            const id = req.params.id
            const alldata = await laptopCollection.find({}).toArray()
            const search = alldata.filter(data => data.category_id == id)
            console.log(search);
            res.send(search)

        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email
            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }

            const result = await orderCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/bookings/:id', async(req, res) =>{
            const id = req.params.id
            const query = {_id: ObjectId(id)}
            const result = await orderCollection.findOne(query)
            res.send(result)
        } )

        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })

        app.post('/create-payment-intent', async(req, res)=>{
            const booking = req.body
            const prices = booking.prices
            const amount = prices * 100

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                  ],

            })
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
        })

        app.post('/payments', async(req, res) =>{
            const payment = req.body
            const result = await paymentsCollection.insertOne(payment)
            const id = payment.OrderId
            const query = {_id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId 
                }
            }
            const updated = await orderCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body
            const result = await orderCollection.insertOne(booking)
            res.send(result)
        })

        app.get('/users',   async (req, res) => {
            const query = {}
            const allUsers = await usersCollection.find(query).toArray()
            res.send(allUsers)
        })
        app.get('/users/admin/:email',  async(req, res) => {
            const email = req.params.email
            // const id = req.params.id
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({isAdmin: user?.role === 'admin' })
        })

        app.get('/users/seller/:email', async(req, res)=>{
            
            const email = req.params.email
            // const id = req.params.id
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({isSeller: user?.role === 'Seller' })
        })
        app.get('/users/buyer/:email', async(req, res)=>{
            const email = req.params.email
            // const id = req.params.id
            const query = { email }
            const user = await usersCollection.findOne(query)
            res.send({isBuyers: user?.role === 'Buyers' })
        })

        app.get('/sellerProduct', async(req, res) =>{

            let query = {}
            if(req.query.email){
                query = {
                    email: req.query.email
                }
            }
            const products = await addProductCollection.find(query).toArray()
            res.send(products)
        })
        app.get('/reports', async(req, res) =>{
            const query = {}
            const result = await adminReportCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.post('/reports', async(req, res) =>{
            const report = req.body
            const result = await adminReportCollection.insertOne(report)
            res.send(result)
        })


        app.post('/sellerProduct',verifyJWT, async (req, res) => {
            const addProduct = req.body
            const result = await addProductCollection.insertOne(addProduct);
            res.send(result)
        })

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {

            const decodedEmail = req.decoded.email
            const query = {email: decodedEmail}
            const user = await usersCollection.findOne(query)
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbiden access'})
            }
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    role: 'admin'

                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        
        app.patch('/users/:id', async(req, res) =>{
            const id = req.params.id
            const status = req.body.status
            const query = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    status: status,
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        app.delete('/users/:id', async(req, res)=>{
            const id = req.params.id
            const query = {_id: ObjectId(id)}
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/sellerProduct/:id',verifyJWT, async(req, res) =>{
            const id = req.params.id
            const filter = {_id: ObjectId(id) }
            const result = await addProductCollection.deleteOne(filter)
            res.send(result)
        })
        app.delete('/reports/:id', async(req, res)=> {
            const id = req.params.id
            const filter = {_id: ObjectId(id)}
            const result = await adminReportCollection.deleteOne(filter)
            res.send(result)
        })
        app.delete('/laptops/:id', async(req, res)=> {
            const id = req.params.id
            const filter = {_id: ObjectId(id)}
            const result = await laptopCollection.deleteOne(filter)
            res.send(result)
        })




    }
    finally {

    }

}
run().catch(console.log())


app.get('/', (req, res) => {
    res.send('Api is running')
})

app.listen(port, () => {
    console.log('api is running on', port);
})