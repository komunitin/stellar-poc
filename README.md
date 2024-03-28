# Komunitin Stellar Proof of Concept
Proof of concept of the Komunitin model in the Stellar network. 

## Run 
```
yarn start
```

## Model definition
This script uses [Stellar](https://stellar.org) testnet to create the accounts and assets in the Stellar network to model a set of local community currencies and accounts. This model is a representation in the Stellar network for community currencies, with the following features:
 - Each community currency has its own asset.
 - Each user in the community has an account with a balance of the local asset.
 - Each community currency has an administration account that can fund and manage user accounts.
 - All XLM base reserves and transaction fees are sponsored by a single global sponsor account.
 - Each community sets the value of its currency in terms of a global imaginary value (the HOUR).
 - Community currencies can set trade agreements with other trusted communities, limiting the trade balance.
 - Users from one community can trade with users from another community, all using only their respective local assets, through a path of previous trade agreements between currencies.

<img src="./doc/komunitin-stellar-model.svg">


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
- [Multi-signature](https://developers.stellar.org/docs/glossary/multisig/)
- [Assets](https://developers.stellar.org/docs/glossary/asset/)
- [Payments](https://developers.stellar.org/docs/glossary/payment-operation/)
- [Passive sell offers](https://developers.stellar.org/docs/glossary/passive-offer/)
- [Path payment](https://developers.stellar.org/docs/glossary/path-payment-operation/)
- [Sponsored reserves](https://developers.stellar.org/docs/learn/encyclopedia/sponsored-reserves)
- [Fee bump transactions](https://developers.stellar.org/docs/glossary/fee-bump-transaction/)


## Stellar features to be used
There are some features that are not used in this proof of concept but will be used in the final implementation:
 - [Flags](https://developers.stellar.org/docs/glossary/flags/): Fine-tune the permissions of defined assets.
 - [Account domains](https://developers.stellar.org/docs/glossary/account-domains/): Define the domain of issuing accounts.
 - [Path discovery](https://developers.stellar.org/network/horizon/aggregations/paths/strict-receive): Find path between asssets.


## Other comments
 - This PoC do not take in count key management considerations and functions often receive more keys than needed.
 - The model may need to be refined. For example, it could be useful to split the external account into two accounts, one for issuing and one for trading.
 - It could also be necessary to have one sponsor account per community currency.
 - Whenever an external account buys some external HOUR asset, it should set (or increase if already set) a sell offer to sell it back to whoever owns their HOUR asset thus clearing its debt.
 
