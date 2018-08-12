const bitcoin  = require('bitcoinjs-lib');
var bip65 = require('bip65');

const config = require('./config.js');
const Client = require('bitcoin-core');
const client = new Client(config.server.regtest);

const network = bitcoin.networks.testnet;

FEE = 0.001

var alice = bitcoin.ECPair.fromWIF(
	'cPbcvQW16faWQyAJD5sJ67acMtniFyodhvCZ4bqUnKyjataXKLd5', bitcoin.networks.testnet
	);
var bob = bitcoin.ECPair.fromWIF(
	'cTgR2GrYrH3Z9UULxGEpfAhM4mAsmFRAULUwp5KYFM9R9khxYJ4v', bitcoin.networks.testnet
	);

function getAddress(keypair){
	pkh = bitcoin.payments.p2pkh({pubkey: keypair.publicKey, network: bitcoin.networks.testnet});
	return pkh.address;
}

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

        bitcoin.crypto.hash160(bob.publicKey),//bob.getPublicKeyBuffer(),// redeemer address                
        bitcoin.opcodes.OP_ELSE,
        bitcoin.script.number.encode(redeemblocknum),
        bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.opcodes.OP_DROP,
        bitcoin.opcodes.OP_DUP,
        bitcoin.opcodes.OP_HASH160,

        bitcoin.crypto.hash160(alice.publicKey),//alice.getPublicKeyBuffer(), // funder addr
        /* ALMOST THE END. */
        bitcoin.opcodes.OP_ENDIF,

        // Complete the signature check.
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_CHECKSIG
    ]);   
    console.log(redeemScript.toString('hex')); 
    //var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript));
    //var address = bitcoin.address.fromOutputScript(scriptPubKey, network)

    var address = bitcoin.payments.p2sh({ redeem: { output: redeemScript, network: network }, network: network })
    var address = address.address    

    await client.importAddress(address, "");
    
    return {
    	'p2sh': address,
    	'redeemblocknum' : redeemblocknum,
    	'redeemScript': redeemScript,
    	'locktime': locktime
    }

}

async function fundHtlc(p2sh, amount){    
	// await client.setTxFee(0.001);
	txid = await client.sendToAddress(p2sh, amount);
	return txid;
}


// implicit redeem by bob
async function redeem(contract, fundtx, secret){
    // TODO: remove next line
    // await client.generate(1); 


	redeemScript = contract['redeemScript'];

	var txb = new bitcoin.TransactionBuilder(network);
	console.log('----W----A----N----C----H----A----I----N----');
	console.log(JSON.stringify(fundtx))
	console.log('----W----A----N----C----H----A----I----N----');
	txb.addInput(fundtx.txid, fundtx.vout);
	txb.addOutput(getAddress(bob), (fundtx.amount-FEE)*100000000);

	const tx = txb.buildIncomplete()
	const sigHash = tx.hashForSignature(0, redeemScript, bitcoin.Transaction.SIGHASH_ALL);

	const redeemScriptSig = bitcoin.payments.p2sh({
		redeem: {
			input: bitcoin.script.compile([
				bitcoin.script.signature.encode(bob.sign(sigHash), bitcoin.Transaction.SIGHASH_ALL),
				bob.publicKey,
				Buffer.from(secret, 'utf-8'),
				bitcoin.opcodes.OP_TRUE
				]),
			output: redeemScript,
		},
		network: bitcoin.networks.regtest
	}).input
	tx.setInputScript(0, redeemScriptSig);
	console.log("redeem raw tx: \n" + tx.toHex());
	await client.sendRawTransaction(tx.toHex(), function(err){console.log(err);});
}

async function main(){
	await client.generate(1);

	await client.importAddress(getAddress(alice), "");
	await client.importAddress(getAddress(bob), "");

	aliceBalance = await client.getReceivedByAddress(getAddress(alice), 0);
	//console.log("alice balance:" + aliceBalance);

	//utxo = await findOneTxToAddress(bob.getAddress());
	//console.log(JSON.stringify(utxo, null, 4));

	contract = await hashtimelockcontract(commitment, 10);

	await fundHtlc(contract['p2sh'], 16);
	fundtx = await findOneTxToAddress(contract['p2sh']);
	console.log("fundtx:" + JSON.stringify(fundtx, null, 4));


    oldBobBalance = await client.getReceivedByAddress(getAddress(bob), 0);


	await redeem(contract, fundtx, secret);


	newBobBalance = await client.getReceivedByAddress(getAddress(bob), 0);
    console.log("oldBalance: " + oldBobBalance);
    console.log("newBalance: " + newBobBalance);

    
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