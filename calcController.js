const axios = require('axios');

module.exports = {
    mortCalc: (req, res) => {
        console.log(`we've been hit!!!`)
        res.status(200).send(`you cannot afford things`)
    }
}