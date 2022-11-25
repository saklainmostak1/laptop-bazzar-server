const express = require('express');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vfwpldl.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {

    try {
        const categoryCollection = client.db('useProduct').collection('categoryNames')

        const laptopCollection = client.db('useProduct').collection('laptops')
       


        app.get('/categoryNames', async (req, res) => {
            const query = {}
            const result = await categoryCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/laptops', async(req, res) =>{
            const query = {}
            const result = await laptopCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/laptops/:id', async(req, res) =>{
            const id = req.params.id
            const data = {_id: ObjectId(id)}
            const result = await laptopCollection.findOne(data)
            res.send(result)
           
        })
       
       app.get('/category/:id', async(req, res) =>{
        const id = req.params.id
        const alldata = await laptopCollection.find({}).toArray()
        const search=alldata.filter(data=>data.category_id==id)
        console.log(search);
        res.send(search)
        
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