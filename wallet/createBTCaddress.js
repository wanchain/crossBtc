'use strict';

const bitcoin  = require('bitcoinjs-lib');
const crypto = require('crypto');
const wif = require('wif');
const bip38 = require('bip38');
const loki = require('lokijs');

let debug = true;
// let debug = false;

let bitcoinNetwork = bitcoin.networks.bitcoin;
let version = 0x80;
if (debug) {
    bitcoinNetwork = bitcoin.networks.testnet;
    version = 0xef;
}

let db = new loki('btc.db');
let btcAddress = db.getCollection("btcAddress");
if (btcAddress === null) { btcAddress = db.addCollection("btcAddress")}


function rng () {
    if (debug) {return Buffer.from('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')}

    return Buffer.from(crypto.randomBytes(32))
}

async function genBip38Wallet(pwd) {
    try {
        const keyPair = bitcoin.ECPair.makeRandom({network: bitcoinNetwork, rng: rng});
        const { address } = await bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoinNetwork });
        const privateKey = keyPair.toWIF();
        console.log('privateKey: ', privateKey);

        const decoded = wif.decode(privateKey, version);
        const encrypted = await bip38.encrypt( decoded.privateKey, decoded.compressed, pwd);

        return [address, encrypted]
    } catch (err) {
        console.log('err: ', err);
        return [null, 0]
    }
}

async function decryptedWIF(encrypted, pwd) {
    let decryptedKey = await bip38.decrypt(encrypted, pwd);
    let privateKeyWif = await wif.encode(version, decryptedKey.privateKey, decryptedKey.compressed);

    return privateKeyWif;
}

async function saveAddress(address, encryptedKey) {

    btcAddress.insert({address: address, encryptedKey: encryptedKey}, 4);
    db.save();
}

async function main(pwd) {
    let btcWallet = await genBip38Wallet(pwd);

    let address = btcWallet[0];
    let encryptedKey = btcWallet[1];

    let privateKeyWif = await decryptedWIF(encryptedKey, pwd);

    console.log('address: ', address);
    console.log('encryptedKey: ', encryptedKey);

    console.log('decryptedKey', privateKeyWif);

    await saveAddress(address, encryptedKey);

    let result = btcAddress.find();

    console.log('result: ', result);
}

main('1234567890');


