const axios = require('axios');
const logic = require('./logic');


const rate = 4; //this comes from the external api
// nper = 30,
// maxPmt = 2900,
// downPmt = 35000,
// countyLimit = 600300,
// taxRate = .008,
// insureRate = .0027,
// mi = .0053,
// ltv = 93.11;


module.exports = {
    mortCalc: (req, res) => {
        console.log(`we've been hit!!!`)
        // console.log(req);
        const {
            nper,
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
        } = req.body;
        const maxPmt = logic.maxPmt(monthlyIncome, debts, alimony, childSupport, childCareVA, hoa);
        const countyLimit = logic.findCountyLimit(state, county, loanType);
        const taxRate = logic.findTaxRate(state, county);
        const insureRate = logic.findInsuranceRate(state);

        // This finds max values
        const maxValueDP = logic.maxLoanDP(downPmt);
        const maxValueRatio = logic.pv(rate, nper, maxPmt);

        // This is the max value
        const maxValue = Math.min(maxValueRatio, countyLimit, maxValueDP);
        // find LTV estimate based on max value 
        const ltv = logic.findLTV(maxValue, downPmt);
        const mi = logic.findMI(credit, ltv, years);

        // This is the recursive function that does the actual calculations 
        let mortgageAmount = logic.pmt(rate, nper, maxValue, maxPmt, { ltv, mi, insureRate, taxRate, downPmt, countyLimit, years, credit })

        //Preparing Final Number to be Returned
        mortgageAmount = Math.round(mortgageAmount)
        console.log(Math.round(mortgageAmount))

        res.status(200).send({ mortgageAmount, message: 'you need to buy a bigger home' })
    },
    data: (req, res) => {
        res.status(200).send('here is some data')
    }
}