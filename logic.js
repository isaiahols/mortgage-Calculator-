const axios = require('axios')

module.exports = {
    pV: (rate, nper, pmt, fv) => {
        rate = parseFloat(rate);
        nper = parseFloat(nper);
        pmt = parseFloat(pmt);
        fv = parseFloat(fv);
        if (nper == 0) {
            alert("Why do you want to test me with zeros?");
            return (0);
        }
        if (rate == 0) { // Interest rate is 0
            pv_value = -(fv + (pmt * nper));
        } else {
            x = Math.pow(1 + rate, -nper);
            y = Math.pow(1 + rate, nper);
            pv_value = - (x * (fv * rate - pmt + y * pmt)) / rate;
        }
        pv_value = conv_number(pv_value, 2);
        return (pv_value);
    },
    pMT: (rate, periods, present, future, type) => {

        future = future || 0;
        type = type || 0;

        // rate = utils.parseNumber(rate);
        // periods = utils.parseNumber(periods);
        // present = utils.parseNumber(present);
        // future = utils.parseNumber(future);
        // type = utils.parseNumber(type);
        // if (utils.anyIsError(rate, periods, present, future, type)) {
        //     return error.value;
        // }

        // Return payment
        let result;
        if (rate === 0) {
            result = (present + future) / periods;
        } else {
            let term = Math.pow(1 + rate, periods);
            if (type === 1) {
                result = (future * rate / (term - 1) + present * rate / (1 - 1 / term)) / (1 + rate);
            } else {
                result = future * rate / (term - 1) + present * rate / (1 - 1 / term);
            }
        }
        return -result;
    },
}