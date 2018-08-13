'use strict';


const bitcoin  = require('bitcoinjs-lib');
const config = require('./config.js');
const Client = require('bitcoin-core');
const pu = require('promisefy-util');
let WanchainCore = require('wanchain-crosschain');
let ccUtil;
const client = new Client(config.server.regtest);
//const bip32 = require('bip32');
const bnet = bitcoin.networks.testnet;

const from = "mxTSiHT4fRVysL6URcGwD5WmELTSiJV8PV";
const fromPriv = "cTDgGYxyf1psvn2x1CueypAWNTXvCFL9kzhZhKZFHsP6o7LejjRi";
// const fromWif = bip32.fromBase58(fromPriv, bnet).toWif();
// console.log("Wif: ", fromWif);


const to = "mkuNvfqgGM3EEWkYNEMxP4KzzDWfXc5cEX";
const toamount = 1;
async function  getUtxo(addrs) {
    try {
        let height = await client.getBlockCount();
        console.log("height: ", height);
        let utxos = await client.listUnspent(1, height, addrs);
        return utxos;
    }catch(err){
        console.log(err);
    }
}
async function main() {
    try {
        let height = await client.getBlockCount();
        console.log("height: ", height);
        let utxos = await client.listUnspent(1, height, addrs);
        console.log("listUnspent from: ", listUnspentFrom);
        let listUnspentTo = await client.listUnspent(1, height, [to]);
        console.log("listUnspent to: ", listUnspentTo);
        console.log("==========transfer==============");
        const txb = new bitcoin.TransactionBuilder(bnet);
        txb.setVersion(1);
        txb.addInput(listUnspentFrom[0].txid, listUnspentFrom[0].vout);
        //txb.addOutput(to, listUnspentFrom[0].amount - toamount );
        txb.addOutput(to,3);
        console.log(txb);


    }catch(err){
        console.log("listUnspent error: ", err.toString());
    }



}
function generateTo(){
    let toPair = bitcoin.ECPair.makeRandom({network:bitcoin.networks.testnet});
    let toWIF = toPair.toWIF();
    let toAddr = toPair.getAddress();
    console.log("to address: ", toAddr);
    console.log("to WIF: ", toWIF);
    let newPair = bitcoin.ECPair.fromWIF(toWIF,bnet );
    const newTo = newPair.getAddress(bnet);
    console.log("newTo: ", newTo);
}

async function testListUtxo() {
    let toPair = bitcoin.ECPair.makeRandom({network:bitcoin.networks.testnet});
    let {address} = bitcoin.payments.p2pkh({pubkey: toPair.publicKey, network: bitcoin.networks.testnet});
    console.log("address: ", address);
    let txHash = await client.sendToAddress(address, "0.01");
    console.log("testListUtxo txHash:", txHash);

    let utxos = await getUtxo([address]);
    console.log("utxos: ", utxos);

    await pu.sleep(10000);
    utxos = await getUtxo([address]);
    console.log("utxos: ", utxos);


}

async function init(){
    wanchainCore = new WanchainCore(config);
    ccUtil = wanchainCore.be;
    await wanchainCore.init(config);
}

async function main(){
    await init();
    testListUtxo();
}
