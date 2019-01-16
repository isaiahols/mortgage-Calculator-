const axios = require('axios')
const miTable = require('./dataTables/miTable.json');
const taxInsurance = require('./dataTables/taxInsurance.json');
const loanLimits = require('./dataTables/loanLimits.json');

let rates = 4

const logic = {
    pv: (rate, nper, pmt) => {
        console.log('rate', rate)
        let r = (rate / 100) / 12
        let n = nper * 12
        let pValue = (pmt * (1 - Math.pow(1 + r, -n))) / r;
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
        return maxPayment;
    },

    findRate: (userRate, get) => {
        const rate = 4
        if (get) {

        }
        return userRate || rate
    },

    getRate: () => {
        // rates = await axios.get('https://www.getpostman.com/collections/65e3d9e6aa96e2e64909')
        console.log('rates', rates)
        return rates
    },

    rateConverter: (rate) => {
        return (rate / 100) / 12
    },

    nperConverter: (nper) => {
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

        let ltvFiltered = creditFiltered.find(e => {
            const ltvRange = e["LTV Range"].split('');

            let upperLimit = ltvRange.slice(6).join('') * 1;
            let lowerLimit = ltvRange.slice(0, 5).join('') * 1;

            if (ltv <= upperLimit && ltv >= lowerLimit) {
                return e
            }
        })


        const middleData = {
            "Credit": "640–659",
            "LTV Range": "80.01-85",
            "Credit ": {
                " LTV": "640–659 & 80.01-85"
            },
            "> 20 yr": "0.40%",
            "<= 20 yr": "0.25%"
        }

        ltvFiltered = ltvFiltered || middleData;

        let rate = years <= 20 ? ltvFiltered["<= 20 yr"] : ltvFiltered["> 20 yr"];
        rate = rate.slice(0, 4) / 100

        return rate || "0.40"
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

    findLTV: (maxValue, downPmt, last) => {
        let ltv = 0;
        if (last) {
            ltv = (maxValue - downPmt * 1) / maxValue
        } else {
            ltv = maxValue / (maxValue + (downPmt * 1));
        }

        ltv = (ltv * 100).toFixed(2)
        if (ltv > 97) {
            console.log('LTV is too high', ltv);
        }

        return ltv;
    },

    pmt: (rate, years, pv, max, extra, count = 0) => {


        // Declerations
        const r = logic.rateConverter(rate);
        const n = logic.nperConverter(years);
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
                const finalAmt = extra.countyLimit + extra.downPmt
                return { finalAmt, compare }
            }
            const finalAmt = newerPV + extra.downPmt
            return { finalAmt, compare }
        }

        // console.log(' --- ')
        return logic.pmt(rate, years, newerPV, max, extra, count)
    },
    findReturnData: (maxValue, downPmt, credit, state, years) => {
        const ltv = logic.findLTV(maxValue, downPmt, true)
        const insureRate = logic.findInsuranceRate(state)
        const mi = logic.findMI(credit, ltv, years)
        const taxRate = logic.findTaxRate(state)
        const interestRate = logic.findRate()

        // return P&I payment, 
        const pIPayment = logic.realPmt(interestRate / 100 / 12, years * 12, maxValue)
        console.log("pIPayment", pIPayment)
        // const pIPayment = (maxValue - downPmt) * (1 + interestRate * .01)
        // taxes and insurance
        const taxes = maxValue * taxRate;
        const insurance = (maxValue - downPmt) * insureRate;
        //mortgage insurance
        const mortgageInsur = (maxValue - downPmt) * mi;

        const mortgageAmount = (maxValue - downPmt);
        const MonthlyMortageAmt = mortgageAmount / 12 / years


        // Monthly Things
        const monthlyTaxes = taxes / years / 12;
        const monthlyInsurance = insurance / years / 12;
        const monthlyMortInsurance = mortgageInsur / years / 12;
        const monthlyTaxAndInsure = (taxes + insurance) / years / 12;


        // Final Obj of Stuff
        const data = {
            taxes,
            mortgageInsur,
            insurance,
            pIPayment,
            mortgageAmount,
            downPmt,
            // MonthlyMortageAmt,
            // monthlyTaxes, 
            // monthlyInsurance, 
            // monthlyMortInsurance, 
            // monthlyTaxAndInsure
        };
        return data
    },
    addMessages: (maxFinal, maxCounty, downPmt, ltv) => {

        let message = 'Here are your results';
        if (ltv > 97) {
            message = 'Down Payment is to small'
        } else if (maxFinal - downPmt === maxCounty) {
            message = 'You have reached the county limit'
        }
        return message
    },
};

module.exports = logic;
