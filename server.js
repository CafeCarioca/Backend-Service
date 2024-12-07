//MErcado pago EcommerceCarioca
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
//const checkIP = require('./middlewares/checkIP');

//app.use(checkIP);
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello root route');
});

// Import routes
const productsRoute = require('./routes/products');
//const usersRoute = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const orderroute = require('./routes/orders');
const emailRoute = require('./routes/emails');
//const userRoute = require('./routes/users');

app.use(bodyParser.json());
// Use the routes
app.use('/products', productsRoute);
//app.use('/users', usersRoute);
app.use('/payments', paymentRoutes);
app.use('/orders', orderroute);
app.use('/emails', emailRoute);
//app.use('/user', userRoute);


const port = process.env.PORT || 3000; // You can use environment variables for port configuration

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});