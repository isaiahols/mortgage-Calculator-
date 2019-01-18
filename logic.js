const axios = require('axios')
const miTable = require('./dataTables/miTable.json');
const taxInsurance = require('./dataTables/taxInsurance.json');
const loanLimits = require('./dataTables/loanLimits.json');
const fhaMiTable = require('./dataTables/fhaMiTable.json');

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

    findMI: (credit, ltv, years, loanType) => {
        let ltvFiltered, rate;

        // Check what loan type for different rate tables and rates
        if (loanType === 'Conv.') {
            // find all rates for credit range
            const creditFiltered = miTable.filter(e => {

                if (e.Credit.slice(0, 3) === credit.slice(0, 3)) {
                    return e
                }
            })

            // finds specific rate based on LTV range
            ltvFiltered = creditFiltered.find(e => {
                const ltvRange = e["LTV Range"].split('');

                let upperLimit = ltvRange.slice(6).join('') * 1;
                let lowerLimit = ltvRange.slice(0, 5).join('') * 1;

                if (ltv <= upperLimit && ltv >= lowerLimit) {
                    return e
                }
            })
            // get rate based on length of loan
            rate = years <= 20 ? ltvFiltered["<= 20 yr"] : ltvFiltered["> 20 yr"];
            rate = rate.slice(0, 4) / 100
        } else if (loanType === 'FHA') {
            let yearFiltered
            // check for length of loan
            if (years > 15) {
                yearFiltered = fhaMiTable[0]
            } else {
                yearFiltered = fhaMiTable[1]
            }

            let ltvPivot = yearFiltered["ltvPivot"];

            // select specific rate based on ltv
            rate = yearFiltered.ltvPivot <= ltvPivot ? yearFiltered.ltv[`<=${ltvPivot}`] : yearFiltered.ltv[`>${ltvPivot}`]

            rate = rate / 1000
        }


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


        return rate || "0.0040"
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
        const insurance = pv * extra.insureRate / 12;
        // // ***** QUESTIONS ***** // //
        // do taxes apply to the total value of the home?
        // do the taxes need to take into account the down payment?
        const otherThings = extra.loanType === "FHA" ? (pv + extra.downPmt) * extra.taxRate / 12 : 0;
        const compare = Math.round(pay + mi + tax + insurance + otherThings)
        const delta = compare / max;


        const newerPV = pv + (compare - max < 0 ? (delta < .9 ? pv * .3 : pv * .01) : (delta > 1.1 ? -(pv * .3) : -pv * .01));


        // testing and Recursion

        if (compare === max || count === 2000) {
            if (count === 2000) console.log('ran out of time');
            console.log('count', count)
            console.log('mortgage Payments', pay);
            console.log('total payment', compare)
            console.log('loan max', pv);

            if (pv > extra.countyLimit) {
                console.log('County Limit is the best you can do')
                const finalAmt = extra.countyLimit + extra.downPmt
                const pIPay = logic.realPmt(r, n, extra.countyLimit)

                const monthlyPay = pIPay + mi + tax + insurance + otherThings
                console.log('ending', monthlyPay);

                return { finalAmt, compare: monthlyPay }
            }
            const finalAmt = newerPV + extra.downPmt
            return { finalAmt, compare }
        }

        // console.log(' --- ')
        return logic.pmt(rate, years, newerPV, max, extra, count)
    },
    findReturnData: (maxValue, downPmt, credit, state, years, monthlyPay) => {
        const ltv = logic.findLTV(maxValue, downPmt, true)
        const insureRate = logic.findInsuranceRate(state)
        const mi = logic.findMI(credit, ltv, years)
        const taxRate = logic.findTaxRate(state)
        const interestRate = logic.findRate()

        // return P&I payment, 
        const r = logic.rateConverter(interestRate)
        const n = logic.nperConverter(years)

        const pIPayment = logic.realPmt(r, n, maxValue - downPmt)
        console.log("pIPayment", pIPayment)
        // const pIPayment = (maxValue - downPmt) * (1 + interestRate * .01)
        // taxes and insurance
        const taxes = maxValue * taxRate;
        const insurance = (maxValue - downPmt) * insureRate;
        //mortgage insurance
        const mortgageInsure = (maxValue - downPmt) * mi;

        const loanAmount = (maxValue - downPmt);
        // const MonthlyMortgageAmt = loanAmount / 12


        // Monthly Things
        // const monthlyTaxes = taxes / 12;
        // const monthlyInsurance = insurance / 12;
        const monthlyMortInsurance = mortgageInsure / 12;
        const monthlyTaxAndInsurance = (taxes + insurance) / 12;
        const other = monthlyPay-  (pIPayment + monthlyMortInsurance + monthlyTaxAndInsurance)

        // Final Obj of Stuff
        const data = {
            // taxes,
            // mortgageInsure,
            // insurance,
            pIPayment,
            loanAmount,
            downPmt,
            // MonthlyMortgageAmt,
            // monthlyTaxes, 
            // monthlyInsurance, 
            monthlyMortInsurance,
            monthlyTaxAndInsurance,
            other,
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
