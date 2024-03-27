# Komunitin Stellar Proof of Concept
Proof of concept of the Komunitin model in the Stellar network. 

## Run 
```
yarn start
```

## Model definition
This script uses [Stellar](https://stellar.org) testnet to create the accounts and assets in the Stellar network to model a set of local community groups and accounts. Concretely:
### Global entities
 - Create a sponsoring account and fund it with XLM. Stellar operations for all other accounts will be [sponsored](https://developers.stellar.org/docs/learn/encyclopedia/sponsored-reserves) by this one.
### Community groups
Create 3 test community exchange groups `A`, `B`and `C`. From now on `X` means either `A`, `B` or `C`. For each of the 3:
 - Create minting account (MINTX) and local asset (COINX).
 - Create administration account (ADMINX) and fund it with local asset (COINX)
 - Create 3 user accounts (USERX1, USERX2, USERX3).
### Global trading between groups
External accounts allow trade between different local currencies by providing liquidity and easing the setting of the exchange rate. For each of the 3 currencies:
 - Create external account (EXTX) and the external HOUR asset. There is a different HOUR asset for each currency but we call it all the same since they are meant to be traded 1:1.
 - Create bidirectional passive sell offers COINX vs HOUR with concrete exchange rates.

### Establishing trust between external accounts
- Add some trustlines between external account and other HOUR. Concretely, A's external and B's external extend trustlines to each other, and C's external account.
- Create 1:1 sell offers between own HOUR asset and trusted HOUR assets.

## Test transactions
### Local trade
 - Perform successful trades between users of the same group, signed by user account keys.
 - Perform successful trades between users of the same group, signed by group admin key.
 - Perform unsuccessful trade between users because lack of sufficient funds.

### Global trade
 - Payment from USERA1 to USERB1
 - Payment from USERB2 to USERA2
 - Failed payment from USERC1 to USERA1 (there is no path)
 - Payment from USERA3 to USERC3
 - Payment from USERC1 to USERA1 (now successful because of last payment)
