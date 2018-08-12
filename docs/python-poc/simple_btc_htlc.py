import base58
import bitcoin
import bitcoin.rpc
from bitcoin.core import b2x, lx, x, COIN, CMutableTxOut, COutPoint
from bitcoin.core import CMutableTxIn, CMutableTransaction
from bitcoin.core.script import CScript, OP_DUP, OP_IF, OP_ELSE, OP_ENDIF
from bitcoin.core.script import OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG
from bitcoin.core.script import SignatureHash, SIGHASH_ALL, OP_FALSE, OP_DROP
from bitcoin.core.script import OP_CHECKLOCKTIMEVERIFY, OP_SHA256, OP_TRUE
from bitcoin.core.scripteval import VerifyScript, SCRIPT_VERIFY_P2SH
from bitcoin.wallet import CBitcoinAddress, P2SHBitcoinAddress
from bitcoin.wallet import P2PKHBitcoinAddress, CBitcoinSecret

import random
import hashlib
import binascii

def generate_secret():
    s = ("1234567890abcdefghijklmnopqrstuvwxyz"
         "01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    passlen = 32
    p = "".join(random.sample(s, passlen))
    return p

def secret2Commitment(secret):
    preimage = secret.encode('utf8')
    h = hashlib.sha256(preimage).digest()
    return binascii.hexlify(h).decode('utf8')



FEE = 0.001 * COIN

bitcoin.SelectParams('regtest')

proxy = bitcoin.rpc.Proxy(timeout=1000)
proxy.getaccountaddress('')

def WIF2Address(wifstr):
    c = CBitcoinSecret.from_secret_bytes(bitcoin.base58.CBase58Data(wifstr))
    addr = P2PKHBitcoinAddress.from_pubkey(c.pub)
    return addr, c

addr1, c1 = WIF2Address('cPbcvQW16faWQyAJD5sJ67acMtniFyodhvCZ4bqUnKyjataXKLd5')
alice = {
    'addr': addr1,
    'key': c1
    }
addr2, c2 = WIF2Address('cTgR2GrYrH3Z9UULxGEpfAhM4mAsmFRAULUwp5KYFM9R9khxYJ4v')
bob = {
    'addr': addr2,
    'key': c2
    }

proxy.importaddress(alice['addr'], "", False)
proxy.importaddress(bob['addr'], "", False)

proxy.sendtoaddress(alice['addr'], 100*COIN)


def find_transaction_to_address(proxy, p2sh):
    txs = proxy.listunspent()
    for tx in txs:
        if str(tx['address']) == str(p2sh):
            print("Found tx to p2sh: {0}".format(p2sh))
            return tx

def find_txs_to_address(proxy, p2sh):
    txs = proxy.listunspent()
    for tx in txs:
        if str(tx['address']) == str(p2sh):
            print(tx)

proxy = bitcoin.rpc.Proxy(timeout=1000)
# alice_receive_mony_tx = find_transaction_to_address(proxy, alice['addr'])

# secret = 'LgsQ5Y89f3IVkyGJ6UeRnEPT4Aum7Hvz'
# commitment = 'bf19f1b16bea379e6c3978920afabb506a6694179464355191d9a7f76ab79483'
secret = generate_secret()
commitment = secret2Commitment(secret)

def hashtimelockcontract(proxy, funder, redeemer, commitment, locktime):
    funderAddr = CBitcoinAddress('ms6KpXRvUwwygwzgRoANRwgcGskXcnEwAr')
    redeemerAddr = CBitcoinAddress('mph94e6SCNUPpyZBhBXHdRZyz1f4DDzeJK')

    if type(commitment) == str:
        commitment = x(commitment)
    else:
        raise ValueError("Commitment was not a string: {0}".format(commitment))
    blocknum = proxy.getblockcount()
    print("Current blocknum on Bitcoin: ", blocknum)
    redeemblocknum = blocknum + locktime
    print("Redeemblocknum on Bitcoin: ", redeemblocknum)
    redeemScript = CScript([
        OP_IF, OP_SHA256, commitment, OP_EQUALVERIFY, OP_DUP, OP_HASH160,
        redeemerAddr, OP_ELSE, redeemblocknum, OP_CHECKLOCKTIMEVERIFY,
        OP_DROP, OP_DUP, OP_HASH160, funderAddr, OP_ENDIF, OP_EQUALVERIFY,
        OP_CHECKSIG])
    # print("Redeem script for p2sh contract on Bitcoin blockchain: "
    #        "{0}".format(b2x(redeemScript)))
    txin_scriptPubKey = redeemScript.to_p2sh_scriptPubKey()
    # Convert the P2SH scriptPubKey to a base58 Bitcoin address
    txin_p2sh_address = CBitcoinAddress.from_scriptPubKey(
        txin_scriptPubKey)
    p2sh = str(txin_p2sh_address)
    # Import address at same time you create
    proxy.importaddress(p2sh, "", False)
    print("p2sh computed", p2sh)
    return {'p2sh': p2sh,
            'redeemblocknum': redeemblocknum,
            'redeemScript': b2x(redeemScript),
            'redeemer': redeemer,
            'funder': funder,
            'locktime': locktime}

contract = hashtimelockcontract(proxy, alice['addr'], bob['addr'], commitment, 100)

def fund_htlc(proxy, p2sh, amount):
    send_amount = float(amount) * COIN
    # Import address at same time that you fund it
    proxy.importaddress(p2sh, "", False)
    fund_txid = proxy.sendtoaddress(p2sh, send_amount)
    txid = b2x(lx(b2x(fund_txid)))
    return txid

fundtxid = fund_htlc(proxy, contract['p2sh'], 17)
fundtx = find_transaction_to_address(proxy, contract['p2sh'])

def getProxy():
	return bitcoin.rpc.Proxy(timeout=1000)

proxy = bitcoin.rpc.Proxy(timeout=1000)


def redeem(proxy, redeemerGuy, contract, fundtx, secret):
    print('redeemPubKey', redeemerGuy['addr'])
    # TODO: Compare with script on blockchain?
    redeemScript = CScript(x(contract['redeemScript']))
    txin = CMutableTxIn(fundtx['outpoint'])
    txout = CMutableTxOut(fundtx['amount'] - FEE,
                          redeemerGuy['addr'].to_scriptPubKey())

    # Create the unsigned raw transaction.
    tx = CMutableTransaction([txin], [txout])
    sighash = SignatureHash(redeemScript, tx, 0, SIGHASH_ALL)
    # TODO: protect privkey better, separate signing from rawtx creation
    #privkey = self.bitcoind.dumpprivkey(self.redeemPubKey)
    sig = redeemerGuy['key'].sign(sighash) + bytes([SIGHASH_ALL])
    preimage = secret.encode('utf-8')
    # preimage = x(secret)
    txin.scriptSig = CScript([sig, redeemerGuy['key'].pub, preimage,
                              OP_TRUE, redeemScript])

    # print("txin.scriptSig", b2x(txin.scriptSig))
    txin_scriptPubKey = redeemScript.to_p2sh_scriptPubKey()
    print('Raw redeem transaction hex: ', b2x(tx.serialize()))
    VerifyScript(txin.scriptSig, txin_scriptPubKey,
                 tx, 0, (SCRIPT_VERIFY_P2SH,))
    print("Script verified, sending raw transaction...")
    txid = proxy.sendrawtransaction(tx)
    fund_tx = str(fundtx['outpoint'])
    redeem_tx = b2x(lx(b2x(txid)))
    return {"redeem_tx": redeem_tx, "fund_tx": fund_tx}


def refund(proxy, refundGuy, contract):
    redeemScript = CScript(x(contract['redeemScript']))
    txin = CMutableTxIn(fundtx['outpoint'])
    txout = CMutableTxOut(fundtx['amount'] - FEE,
                          refundGuy['addr'].to_scriptPubKey())

    tx = CMutableTransaction([txin], [txout])
    txin.nSequence = 0
    tx.nLockTime = contract['redeemblocknum']
    sighash = SignatureHash(redeemScript, tx, 0, SIGHASH_ALL)

    sig = refundGuy['key'].sign(sighash) + bytes([SIGHASH_ALL])

    txin.scriptSig = CScript([sig, refundGuy['key'].pub, OP_FALSE, redeemScript])

    txin_scriptPubKey = redeemScript.to_p2sh_scriptPubKey()
    print('Raw redeem transaction hex: {0}'.format(b2x(tx.serialize())))
    res = VerifyScript(txin.scriptSig, txin_scriptPubKey,
                       tx, 0, (SCRIPT_VERIFY_P2SH,))
    print("Script verified, sending raw transaction... (NOT)", res)

    txid = proxy.sendrawtransaction(tx)
    refund_tx = b2x(lx(b2x(txid)))
    fund_tx = str(fundtx['outpoint'])
    return {"refund_tx": refund_tx, "fund_tx": fund_tx}


# redeemResult = redeem(proxy, bob, contract, fundtx, secret)
# proxy.getreceivedbyaddress(bob['addr'], 0)
# refund(prxoy, alice, contract)


