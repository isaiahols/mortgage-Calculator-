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

    pmt: (r, n, pv) => {
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

            rate /= 100
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

    mainCalc: (rate, years, pv, max, extra, count = 0) => {
        // console.log("Max PV (line 167)", pv)

        // Declarations
        const r = logic.rateConverter(rate);
        const n = logic.nperConverter(years);
        let mi = 0;

        // Actual calc for payment

        const pay = logic.pmt(r, n, pv)




        // Add taxes, MI, and other things
        const ltv = logic.findLTV(pv, extra.downPmt);
        extra.ltv = ltv;

        if (extra.loanType !== "VA" || extra.loanType !== 'Jumbo') {
            extra.miRateRate = 0
        } else if (extra.ltv > 80) {
            extra.miRate = logic.findMI(extra.credit, ltv, extra.years, extra.loanType);
            // console.log("MI rate", extra.miRate)

            mi = (extra.miRate * (pv / 12));
            // console.log("ltv", ltv)
        } else {

        }
        count++;





        // Things used in testing and Recursion section

        let tax = (pv + extra.downPmt) * extra.taxRate / 12;
        let insurance = (pv + extra.downPmt) * extra.insureRate / 12;
        // // ***** QUESTIONS ***** // //
        // do taxes apply to the total value of the home?
        // does the Insurance need to take into account the down payment?
        // const otherThings = extra.loanType === "FHA" ? (pv + extra.downPmt) * extra.taxRate / 12 : 0;
        const compare = Math.round(pay + mi + tax + insurance)
        const delta = compare / max;
        // console.log("Compare vs Max", compare, max);


        const newerPV = pv + (compare - max < 0 ? (delta < .9 ? pv * .3 : pv * .01) : (delta > 1.1 ? -(pv * .3) : -pv * .01));



        // testing and Recursion

        if (compare === max || count === 2000) {
            if (count === 2000) console.log('ran out of time');
            console.log('count', count)
            console.log('mortgage Payments', pay);
            console.log('total payment', compare)
            console.log('loan max', pv);
            // const fundingFeeRate = 0;
            // let otherThings = 0;
            // if (extra.loanType === "VA") {
            // } else if (extra.loanType === "FHA") {
            //     fundingFeeRate = 0.0175
            // }


            if (pv > extra.countyLimit) {
                console.log('County Limit is the best you can do')
                let finalAmt = extra.countyLimit + extra.downPmt
                const pIPay = logic.pmt(r, n, extra.countyLimit)
                // Re-find values
                mi = extra.miRate * ((finalAmt - extra.downPmt) / 12);
                tax = finalAmt * extra.taxRate / 12;
                insurance = finalAmt * extra.insureRate / 12;

                const monthlyPay = pIPay + mi + tax + insurance
                console.log('ending', monthlyPay);
                if (extra.loanType === "FHA") {
                    finalAmt *= (1 - 0.0175)
                }

                return { finalAmt, compare: monthlyPay }
            }
            let finalAmt = pv + extra.downPmt
            if (extra.loanType === "FHA") {
                finalAmt *= (1 - 0.0175)
            }
            return { finalAmt, compare }
        }

        // console.log(' --- ')
        return logic.mainCalc(rate, years, newerPV, max, extra, count)
    },
    findReturnData: (maxValue, downPmt, credit, state, years, monthlyPay, loanType) => {
        const ltv = logic.findLTV(maxValue, downPmt, true)
        const insureRate = logic.findInsuranceRate(state)
        const miRate = logic.findMI(credit, ltv, years, loanType)
        const taxRate = logic.findTaxRate(state)
        const interestRate = logic.findRate()


        if (loanType === "FHA") {
            maxValue *= 1.0175
        }
        // return P&I payment, 
        const r = logic.rateConverter(interestRate)
        const n = logic.nperConverter(years)

        // independent Principal and Interest Payment Check
        const pIPayment = logic.pmt(r, n, maxValue - downPmt)


        //Getting Values
        const loanAmount = (maxValue - downPmt);
        let mi
            = 0;
        if (ltv > 80 && loanType !== "VA") {
            mi = miRate * (loanAmount / 12)
        }
        const tax = (maxValue) * taxRate / 12;
        const insurance = (maxValue) * insureRate / 12;


        const monthlyTaxAndInsurance = (tax + insurance);
        let otherFees = 0;
        if (loanType === "FHA") {
            // otherFees += pIPayment * 0.0175;
        }
        const independentCheck = (monthlyPay - (pIPayment + mi + monthlyTaxAndInsurance + otherFees))
        const fundingFee = loanType === "FHA" || loanType === "VA" ? maxValue * 0.0175 : 0;



        // Final Obj of Stuff
        const data = {
            pIPayment,
            loanAmount,
            downPmt,
            fundingFee,
            mi,
            tax,
            insurance,
            otherFees,
            monthlyPay,
            independentCheck,
        };
        return data
    },
    addMessages: (maxFinal, maxCounty, downPmt, ltv) => {
        // console.log("Message Parts Max Final", maxFinal);
        // console.log("Message Parts Max County", maxCounty);
        // console.log("Message Parts Down Payment", downPmt);
        // console.log("Message Parts LTV", ltv);

        let message = 'Here are your results';
        if (ltv > 97) {
            message = 'Down Payment is to small'
        } else if ((maxFinal - downPmt) === maxCounty) {
            message = 'You have reached the county limit'
        }
        return message
    },
    addVersionNotes: () => {
        return ({
            version: "1.1.7.3",
            releaseDate: "04 Feb 2019",
            currentIssues: [
                "Conv. still coming out high after adding funding Fee",
                "Not sure if funding fee is taken of after mi , tax, and insurance are calculated as with the excel doc or if those should take funding fee into account"
            ]
        })
    }
};

module.exports = logic;

// ** React in existing WordPress site **//
// https://medium.com/@ReactionGears/react-app-inside-a-wordpress-page-or-post-4c7d38181b3d
// https://reactjs.org/docs/add-react-to-a-website.html