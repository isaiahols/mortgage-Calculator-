// // * * * IMPORTS AND DECLARATIONS * * * // //
const express = require('express');
const cc = require('./calcController');
// const ac = require('./authController');


const app = express();
const port = 4646;


// // * * * MIDDLEWARE * * * // // 
app.use(express.json())



// // * * * ENDPOINTS * * * // //

// -- MORTGAGE CALCULATOR -- //

// GET

app.get('/api/calc',cc.checkBody, cc.mortCalc); 
app.get('/api/data', cc.data);



// -- TESTING -- //

app.get('/testing', (req,res)=>{
    res.sendStatus(200).send("This is a Test that is working")
    console.log('she is looking now');
    
})






// getting and setting rate Middleware





// // * * * PLEASE DO NOT TOUCH ANYTHING BELOW HERE * * * // //

app.listen(port, () => {
    console.log(`we hear everything on ${port}`);

})