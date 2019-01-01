const axios = require('axios')


const logic = {
    pv: (rate, nper, pmt) => {
        let r = (rate / 100) / 12
        let n = nper * 12
        let pValue = (pmt * (1 - Math.pow(1 + r, -n))) / r;
        // console.log(pValue)
        return pValue;
    },

    realPmt: (r, n, pv) => {
        return ((pv * r) / (1 - Math.pow(1 + r, -n)))
    },

    maxLoanDP: (dp) => {
        return (dp / .03) - dp
    },

    maxPmt: (income, debts, alimony, childSupport, childCareVA, hoa) => {
        const combinedRatio = .45;
        const maxPayment = (combinedRatio * income) - (debts + alimony + childSupport + childCareVA, hoa);
        console.log("maxPayment", maxPayment)
        return maxPayment;
    },

    rateConverter: (rate) => {
        return (rate / 100) / 12
    },

    nperConverter: nper => {
        return nper * 12
    },

    findTaxRate: () => {
        return .008
    },

    findInsuranceRate: () => {
        return .0027
    },

    findMI: () => {
        return .0053
    },

    findCountyLimit: (state, county) => {
        const stateSearch = state.split('')[0].toUpperCase()
        let searchTerm = `${state} - `

        return 600300
    },

    findLTV: () => {
        return 93.11
    },

    pmt: (rate, nper, pv, max, extra, count = 0) => {


        // Declerations
        const r = logic.rateConverter(rate);
        const n = logic.nperConverter(nper);
        let mi = 0;

        // Actual calc for payment

        const pay = logic.realPmt(r, n, pv)
        // const pay = ((pv*r)/(1-Math.pow(1+r,-n)))






        // Add taxes, MI, and other things

        if (extra.ltv > 80) {
            // console.log('you need MI')
            // console.log('miFac', extra.miFac)
            mi = (extra.miFac * (pv / 12))
            // console.log('MI', mi)
        }
        count++;





        // Things used in testing and Recursion section

        // const tax = pv * extra.taxRate / 12
        const tax = (pv + extra.downPmt) * extra.taxRate / 12
        // // ***** QUESTIONS ***** // //
        // do taxes apply to the total value of the home?
        // do the taxes need to take into account the down payment?
        const compare = Math.round(pay + mi + tax)
        const delta = compare / max;
        const newerPV = pv + (compare - max < 0 ? (delta < .9 ? pv * .3 : pv * .01) : (delta > 1.1 ? -(pv * .3) : -pv * .01));


        // testing and Recursion

        if (compare === max || count === 2000) {
            if (count === 2000) console.log('ran out of time');
            console.log('count', count)
            if (pv > extra.countyLimit) {
                console.log('County Limit is the best you can do')
                return extra.countyLimit + extra.downPmt
            }
            return pv + extra.downPmt
        }

        // console.log(' --- ')
        return logic.pmt(rate, nper, newerPV, max, extra, count)
    },
};

module.exports = logic;
