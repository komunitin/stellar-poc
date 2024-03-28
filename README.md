# Komunitin Stellar Proof of Concept
Proof of concept of the Komunitin model in the Stellar network. 

## Run 
```
yarn start
```

## Model definition
This script uses [Stellar](https://stellar.org) testnet to create the accounts and assets in the Stellar network to model a set of local community currencies and accounts. Concretely:

### Global entities
 - Create a sponsoring account and fund it with XLM. Stellar operations for all other accounts will be [sponsored](https://developers.stellar.org/docs/learn/encyclopedia/sponsored-reserves) by this one.

### Community currencies
Create 2 test community exchange currencies `A` and `B`. From now on `X` means either `A` or `C`. For each of the 2 currencies:
 - Create issuer account (ISSX) and local asset (COINX).
 - Create administration account (ADMX) and fund it with local asset (COINX)
 - Create 1 user accounts (UX1, UX2).

### Global trading between currencies
External accounts allow trade between different local currencies by providing liquidity and easing the setting of the exchange rate. For each of the 2 currencies:
 - Create external account (EXTX) and the external HOUR asset. There is a different HOUR asset for each currency but we call it all the same since they are meant to be traded 1:1.
 - Create bidirectional passive sell offers COINX vs HOUR with defined exchange rate.

### Establishing trust between external accounts
- Add some trustlines between external account and other HOUR. Concretely, A's external and B's external extend trustlines to each other.
- Create 1:1 passive sell offers between own HOUR asset and trusted HOUR assets.

## Test transactions
### Local trade
 - Perform successful trades between users of the same currencies, signed by user account keys.
 - Perform successful trades between users of the same currencies, signed by currency admin key.


### Global trade
 - Perform successful trades between users of different currencies.

## Stellar features used
- [Accounts](https://developers.stellar.org/docs/glossary/create-account-operation/)
- [Assets](https://developers.stellar.org/docs/glossary/asset/)
- [Payments](https://developers.stellar.org/docs/glossary/payment-operation/)
- [Passive sell offers](https://developers.stellar.org/docs/glossary/passive-offer/)
- [Path payment](https://developers.stellar.org/docs/glossary/path-payment-operation/)
- [Sponsored reserves](https://developers.stellar.org/docs/learn/encyclopedia/sponsored-reserves)
- [Multi-signature](https://developers.stellar.org/docs/glossary/multisig/)

## Stellar features to be used
There are some features that are not used in this proof of concept but will be used in the final implementation:
 - [Flags](https://developers.stellar.org/docs/glossary/flags/): Fine-tune the permissions of defined assets.
 - [Account domains](https://developers.stellar.org/docs/glossary/account-domains/): Define the domain of issuing accounts.
 - [Path discovery](https://developers.stellar.org/network/horizon/aggregations/paths/strict-receive): Find path between asssets.


 
