const bitcoin  = require('bitcoinjs-lib');
var bip65 = require('bip65');

const config = require('./config.js');
const Client = require('bitcoin-core');
const client = new Client(config.server.regtest);

const network = bitcoin.networks.testnet;

FEE = 0.001 * 100000000

var alice = bitcoin.ECPair.fromWIF(
	'cPbcvQW16faWQyAJD5sJ67acMtniFyodhvCZ4bqUnKyjataXKLd5', bitcoin.networks.testnet
	);
var bob = bitcoin.ECPair.fromWIF(
	'cTgR2GrYrH3Z9UULxGEpfAhM4mAsmFRAULUwp5KYFM9R9khxYJ4v', bitcoin.networks.testnet
	);

secret = 'LgsQ5Y89f3IVkyGJ6UeRnEPT4Aum7Hvz';
commitment = 'bf19f1b16bea379e6c3978920afabb506a6694179464355191d9a7f76ab79483';

async function findOneTxToAddress(dest){
	txs = await client.listUnspent(0,  1000000, [dest]);
	console.log('find dest: ' + dest);
	for(i = 0; i < txs.length; i++){
		tx = txs[i];		
		if(dest === tx['address']){
			console.log(JSON.stringify(tx, null, 4));
			return tx
		}
	}
	return null
}

print = console.log;
async function hashtimelockcontract(commitment, locktime){
	blocknum = await client.getBlockCount();
	console.log("blocknum:" + blocknum);
    print("Current blocknum on Bitcoin: " + blocknum);
    redeemblocknum = blocknum + locktime;
    print("Redeemblocknum on Bitcoin: " + redeemblocknum);

    redeemScript = bitcoin.script.compile([
        /* MAIN IF BRANCH */
        bitcoin.opcodes.OP_IF,
        bitcoin.opcodes.OP_SHA256,
        Buffer.from(commitment, 'hex'),
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,

        bitcoin.crypto.hash160(bob.getPublicKeyBuffer()),//bob.getPublicKeyBuffer(),// redeemer address                
        bitcoin.opcodes.OP_ELSE,
        bitcoin.script.number.encode(redeemblocknum),
        bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.opcodes.OP_DROP,
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,

        bitcoin.crypto.hash160(alice.getPublicKeyBuffer()),//alice.getPublicKeyBuffer(), // funder addr
        /* ALMOST THE END. */
        bitcoin.opcodes.OP_ENDIF,

        // Complete the signature check.
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ]);    
    var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript));
    var address = bitcoin.address.fromOutputScript(scriptPubKey, network)

    await client.importAddress(address, "");
    
    return {
    	'p2sh': address,
    	'redeemblocknum' : redeemblocknum,
    	'redeemScript': redeemScript,
    	'locktime': locktime
    }

}

async function fundHtlc(p2sh, amount){
	await client.setTxFee(0.001);
	txid = await client.sendToAddress(p2sh, amount);
	return txid;
}

// implicit redeem by bob
async function redeem(contract, fundtx, secret){


}

async function main(){
	await client.generate(1);

	await client.importAddress(alice.getAddress(), "");
	await client.importAddress(bob.getAddress(), "");

	aliceBalance = await client.getReceivedByAddress(alice.getAddress(), 0);
	//console.log("alice balance:" + aliceBalance);

	//utxo = await findOneTxToAddress(bob.getAddress());
	//console.log(JSON.stringify(utxo, null, 4));

	contract = await hashtimelockcontract(commitment, 10);

	await fundHtlc(contract['p2sh'], 16);
	fundtx = await findOneTxToAddress(contract['p2sh']);
	console.log("fundtx:" + JSON.stringify(fundtx, null, 4));




    console.log('----W----A----N----C----H----A----I----N----');
    //console.log('contract:   ' + JSON.stringify(contract, null, 4));

    // await client.generate(1);
    // oldAliceBalance = await client.getReceivedByAddress(alice.getAddress(), 0);
    // whatisthis = await client.sendToAddress(alice.getAddress(), 22);
    // await client.generate(1);
    // newAliceBalance = await client.getReceivedByAddress(alice.getAddress(), 0);
    // console.log("oldBalance: " + oldAliceBalance);
    // console.log("newBalance: " + newAliceBalance);
    // console.log("emmmm: " + whatisthis);
}

main();