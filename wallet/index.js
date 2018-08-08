'use strict';


const btc  = require('bitcoinjs-lib');
const config = require('./config.js');
const Client = require('bitcoin-core');
const client = new Client(config.server.regtest);



async function main() {
    try {
        let balance = await client.getBalance('*', 0);
        console.log("balance: ", balance);
    }catch(err){
        console.log("getBalance error: ", err.toString());
    }

    let paira = btc.ECPair.makeRandom({network:btc.networks.testnet});
    let pairb = btc.ECPair.makeRandom();
    let addra = paira.getAddress();
    console.log(addra);

}

main();