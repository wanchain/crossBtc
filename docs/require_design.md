# CrossChain BTC 3.0 requirement and Design

author  		|date		|		content|
--------------- | ----------|---------------
zhanglihua		|2018.8.10	|	init


## 1. Brief
Similar to crossChain ETH 2.0,   crosschain BTC 3.0 will use HTLC  mechanism.

## 2.wallet
Our BTC wallet don’t own BTC node,  it gets all information from API server.

### 2.1  BTC address management

According to network type, we need support create BTC address
Support to import private-key(WIF, WIF-compressed, hex)
We need manage  more addressed in a local DB.
How to encrypt the wallet DB(after alpha).

### 2.2 manage UTXO

Wallet fetch all UTXO from API server  according to  his addressed, and caculate balance.
Wallet can fresh  UTXO auto/manual 
Wallet don’t save UTXO to DB, just save in memory.

### 2.3  Wallet can send normal transaction.

Wallet select UTXO himself when send transaction.

### 2.4 wallet  generate the transaction script of lock, redeem, revoke.

### 2.5 wallet manage the secret X.

Same to crosschain 2.0

## 3.  API server

API server support fetch all UTXOs of an address.
API server receive signed raw transaction and send to BTC node.
API server monitor our special transaction(lock,redeem,revoke) and save to DB.

## 4. MPC
After alpha
Generate BTC address format when generating lock account.
A new rpc interface for btc transaction sign
A new rpc interface for btc transaction save to DB(for varify, same to 2.0)



## 5. storeman agent
### 5.1 scan blockchain and transaction and UTXO
### 5.2 manage UTXO  store in memory.
We needn’t store UTXO info DB.
When storemanagent restart, which can fetch all UTXO from local rpc.

## 6. smart contract 

BTC has no contract,  the SC on wanchain is similar with 2.0.

# Design

## 1.	Create / import address.
Use “bitcoinjs-lib” npm package
```javascript
const btc  = require('bitcoinjs-lib');
let paira = btc.ECPair.makeRandom({network:btc.networks.testnet});
let addra = paira.getAddress();
```


