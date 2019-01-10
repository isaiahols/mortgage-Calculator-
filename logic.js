const axios = require('axios')
const miTable = require('./dataTables/miTable.json');
const taxInsurance = require('./dataTables/taxInsurance.json');
const loanLimits = require('./dataTables/loanLimits.json');

// let rate = 

const logic = {
    pv: (rate, nper, pmt) => {
        console.log('rate',rate)
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

    maxPmt: (income, debts, alimony, childSupport, childCareVA, hoa, type) => {
        const combinedRatio = (type === 'Conv.' || type === 'Jumbo') ? .45 : .5;
        const maxPayment = (combinedRatio * income) - (debts + alimony + childSupport + childCareVA + hoa);
        console.log("maxPayment", maxPayment)
        return maxPayment;
    },

    findRate: async (userRate) => {

        // const rate = await axios.get('https://www.getpostman.com/collections/65e3d9e6aa96e2e64909')
        const rate = 4
        return userRate || rate
    },

    rateConverter: (rate) => {
        return (rate / 100) / 12
    },

    nperConverter: nper => {
        return nper * 12
    },

    findTaxRate: (state) => {
        const stateFiltered = taxInsurance.find(e => {
            return e.State === state
        })

        const taxRate = stateFiltered.Tax.slice(0, 4) / 100

        return taxRate
    },

    findInsuranceRate: (state) => {
        const stateFiltered = taxInsurance.find(e => {
            return e.State === state
        })

        const insuranceRate = stateFiltered.Insurance.slice(0, 4) / 100

        return insuranceRate
    },

    findMI: (credit, ltv, years) => {
        const creditFiltered = miTable.filter(e => {

            if (e.Credit.slice(0, 3) === credit.slice(0, 3)) {
                return e
            }
        })

        const ltvFiltered = creditFiltered.find(e => {
            const ltvRange = e["LTV Range"].split('');

            let upperLimit = ltvRange.slice(6).join('') * 1;
            let lowerLimit = ltvRange.slice(0, 5).join('') * 1;

            if (ltv <= upperLimit && ltv >= lowerLimit) {
                return e
            }
        })

        let rate = years <= 20 ? ltvFiltered["<= 20 yr"] : ltvFiltered["> 20 yr"];
        rate = rate.slice(0, 4) / 100

        return rate
    },

    findCountyLimit: (state, county, type) => {
        const searchTerm = `${state} - ${county.toUpperCase()}`;
        const foundCounty = loanLimits.find(e => {

            return e.County === searchTerm
        })
        if (type === 'Conv.') {
            type = 'Conforming'
        }

        let limit = foundCounty[type] * 1

        return limit
    },

    findLTV: (maxValue, downPmt) => {
        let ltv = maxValue / (maxValue + (downPmt * 1));
        ltv = (ltv * 100).toFixed(2)
        if (ltv > 97) {
            console.log('LTV is too high');

        }

        return ltv;
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
        const ltv = logic.findLTV(pv, extra.downPmt);
        extra.ltv = ltv;


        if (extra.ltv > 80) {
            extra.mi = logic.findMI(extra.credit, ltv, extra.years);
            mi = (extra.mi * (pv / 12));
        }
        count++;





        // Things used in testing and Recursion section

        // const tax = pv * extra.taxRate / 12
        const tax = (pv + extra.downPmt) * extra.taxRate / 12;
        const insurance = (pv + extra.downPmt) * extra.insureRate / 12;
        // // ***** QUESTIONS ***** // //
        // do taxes apply to the total value of the home?
        // do the taxes need to take into account the down payment?
        const compare = Math.round(pay + mi + tax + insurance)
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
            return newerPV + extra.downPmt
        }

        // console.log(' --- ')
        return logic.pmt(rate, nper, newerPV, max, extra, count)
        return logic.pmt(rate, nper, newerPV, max, extra, count)
    },
    addMessages: (maxFinal, maxCounty,  ) => {
        
    },
};

module.exports = logic;
