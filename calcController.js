const axios = require('axios');
const logic = require('./logic');


// const rate = 4; //this comes from the external api
// years = 30,
// maxPmt = 2900,
// downPmt = 35000,
// countyLimit = 600300,
// taxRate = .008,
// insureRate = .0027,
// mi = .0053,
// ltv = 93.11;

module.exports = {
    mortCalc: async (req, res) => {
        console.log(`we've been hit!!!`)
        // if (req.res) {
        //     console.log(req.res);

        // }
        logic.getRate()
        const {
            downPmt,
            county,
            state,
            credit,
            years,
            loanType,
            monthlyIncome,
            debts,
            alimony,
            childSupport,
            childCareVA,
            vet,
            vetType,
            vetUse,
            vetDisability,
            hoa,
            rate,
        } = req.body;
        // console.log('rate', rate)
        const r = await logic.findRate(rate)
        const maxPmt = logic.maxPmt(monthlyIncome, debts, alimony, childSupport, childCareVA, hoa, loanType);
        const countyLimit = logic.findCountyLimit(state, county, loanType);
        const taxRate = logic.findTaxRate(state, county);
        const insureRate = logic.findInsuranceRate(state);

        // This finds max values
        const maxValueDP = logic.maxLoanDP(downPmt);
        const maxValueRatio = logic.pv(r, years, maxPmt);

        // This is the max value
        const maxValue = Math.min(maxValueRatio, countyLimit, maxValueDP);
        // find LTV estimate based on max value 
        let ltv = logic.findLTV(maxValue, downPmt);
        const mi = logic.findMI(credit, ltv, years);

        // This is the recursive function that does the actual calculations 
        let mortgageAmount = logic.pmt(r, years, maxValue, maxPmt, { ltv, mi, insureRate, taxRate, downPmt, countyLimit, years, credit })




        //Preparing Final Number to be Returned
        mortgageAmount = Math.round(mortgageAmount)
        console.log(Math.round(mortgageAmount))


        ltv = logic.findLTV(mortgageAmount, downPmt, true)


        const messagesAdded = logic.addMessages(mortgageAmount, countyLimit, downPmt, ltv)

        res.status(200).send({ mortgageAmount, message: messagesAdded })
    },
    data: (req, res) => {
        res.status(200).send('here is some data')
    },
    checkBody: (req, res, next) => {
        const {
            county,
            state,
            credit,
            years,
            loanType,
        } = req.body;

        if (
            county &&
            state &&
            credit &&
            years &&
            loanType) {
            next()
        } else {


            const message = {
                message: 'please include all the info that is required. \nWe are expecting data to be included in the body of the request. \nSee expectedData for example body',
                expectedData: {
                    "downPmt": 35000,
                    "county": "Salt Lake",
                    "state": "Utah",
                    "credit": "740-759",
                    "years": 30,
                    "loanType": "FHA",
                    "monthlyIncome": 8000,
                    "debts": 700,
                    "alimony": 0,
                    "childSupport": 0,
                    "childCareVA": 0,
                    "vet": false,
                    "vetType": "regular Military",
                    "vetUse": "1st time",
                    "vetDisability": false,
                    "hoa": 0,
                    "rate": 0
                }
            }

            res.status(403).send(message)

        }
    }
}