const axios = require('axios');
const logic = require('./logic');


const rate = 4,
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
        const countyLimit = logic.findCountyLimit(state, county);
        const taxRate = logic.findTaxRate(state, county);
        const insureRate = logic.findInsuranceRate();
        const mi = logic.findMI();
        const ltv = logic.findLTV();

        const maxValueDP = logic.maxLoanDP(downPmt)
        maxValueRatio = logic.pv(rate, nper, maxPmt),
            maxValue = Math.min(logic.pv(rate, nper, maxPmt), countyLimit, maxValueDP);

        let mortgageAmount = logic.pmt(rate, nper, maxValue, maxPmt, { ltv, mi, insureRate, taxRate, downPmt, countyLimit })

        mortgageAmount = Math.round(mortgageAmount)
        console.log(Math.round(mortgageAmount))

        res.status(200).send({ mortgageAmount, message: 'you need to buy a bigger home' })
    }
}