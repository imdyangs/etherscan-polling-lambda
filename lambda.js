const { time } = require('console');
const https = require('https')

const data = require("./ids.json")
const baseUrl = `https://api.etherscan.io`
const receivingAddress = `` // fill with address
const queryUrl =
    baseUrl + `/api?module=account&action=txlist&address=` +
    receivingAddress + `&startblock=700000&endblock=99999999&sort=desc&apikey=8CGZY4NSWX9DV5XFM1MUFKQPAJA6M2WT1T`;

const GWEI_PER_ETH = 1000000000;
const POLL_INTERVAL = 1000;
const MAX_ATTMEMPTS = 2;

exports.handler = async (event) => {
    const { price, startTime, endTime, type } = event.body;

    let queryResponse = {}
    if (type === "purchaseRequest") {
        try {
            const purchaseRequestInput = {
                price,
                startTime,
                endTime,
                type,
             };
            const res = await purchaseRequestPoll(purchaseRequestInput);
            queryResponse = { ...res };
            console.log(queryResponse)
            const responseObject = {
                data: data,
                price: event.price,
                result: queryResponse,
            }
            console.log(response)
            const response = {
                statusCode: 200,
                body: JSON.stringify(responseObject),
            };
            return response;
        } catch (e) { 
            
        }
    } else if (type === "purchaseFulfilment") {
        // purchaseFulfilment flow if needed
    }
};

// purchaseRequest: begins purchase flow from user input trigger to purchase a
// specific item. purchaseRequest gives the user 3 minutes to fulfil a transaction
// before timing out. Validation is done by checking the ethscan account.
const purchaseRequestPoll = async (purchaseRequestInput) => {
    const { price } = purchaseRequestInput;
    const now = new Date().getTime();
    
    if (now < purchaseRequestInput.startTime || now > purchaseRequestInput.endTime) {
        return "transaction out of start time and end time bounds"
    }
    
    const pollForTransactions = await poll({
        fn: queryAccount,
        validate: verifyPurchaseRequestPollHelper(now, price),
        interval: POLL_INTERVAL,
        maxAttempts: MAX_ATTMEMPTS,
    })
      .then(transactions => {
          return transactions;
      })
      .catch(err => {
          return err;
      });
}

// price comes from the front-end input, we want to check if there's a transaction at that price.
const verifyPurchaseRequestPollHelper = (currTime, price) => (transactions) => {
    for (const transaction in transactions) {
        // first transaction is most recent
        if (transaction.timeStamp <= currTime) {
            continue;
        }
        if (transaction.value !== price) {
            continue;
        }
        if (transaction.isError !== "0") {
            continue;
        }
        return true;
    }
    return false;
}

// price comes from the front-end input, we want to check if there's a transaction at that price.
const getTransactionFromTransactions = (currTime, price, iterations) => (transactions) => {
    for (const transaction in transactions) {
        // first transaction is most recent
        if (transaction.timeStamp <= currTime) {
            continue;
        }
        if (transaction.value !== price) {
            continue;
        }
        if (transaction.isError !== "0") {
            continue;
        }
        return true;
    }
    return false;
}

const purchaseFulfilment = (purchaseFulfilmentInput) => {

}

// queryAccount
const queryAccount = async (account) => {
    let dataString = '';
    // get recent transactions in account
    const queryResponse = await new Promise((resolve, reject) => {
        const req = https.get(queryUrl, function (res) {
            res.on('data', chunk => {
                dataString += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: 200,
                    body: JSON.stringify(JSON.parse(dataString), null, 4)
                });
            });
        });

        req.on('error', (e) => {
            reject({
                statusCode: 500,
                body: 'Something went wrong!'
            });
        });
    });
    
    const result = JSON.parse(queryResponse.body);
    return result.result;
}

// helpers
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const poll = ({ fn, validate, interval, maxAttempts }) => {
  console.log('Start poll...');
  let attempts = 0;

  const executePoll = async (resolve, reject) => {
    console.log('- poll');
    const result = await fn();
    attempts++;

    if (validate(result)) {
      return resolve(result);
    } else if (maxAttempts && attempts === maxAttempts) {
      return reject(new Error('Exceeded max attempts'));
    } else {
      setTimeout(executePoll, interval, resolve, reject);
    }
  };

  return new Promise(executePoll);
};

const simulateServerRequestTime = interval => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, interval);
  });
};
