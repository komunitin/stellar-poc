import { Horizon, Keypair, Asset, TransactionBuilder, BASE_FEE, Networks, Operation } from "@stellar/stellar-sdk"

export class Currency {
  // Currency name: X
  name: string
  // Sponsor account
  sponsor: Keypair
  // Stellar server (testnet)
  server: Horizon.Server

  // Keypair for the currency minting account (MINTX)
  mint: Keypair
  // Keypair for the currency admin account (ADMINX)
  admin: Keypair
  // Stellar Asset for the currency (COINX)
  asset: Asset

  // User accounts of the currency
  users: Keypair[]

  // External account (EXTX)
  external: Keypair
  // External asset (HOUR)
  externalAsset: Asset
  // Price of local asset (COINX) in HOURs.
  externalRate: { n: number, d: number }
  
  constructor(name: string, sponsor: Keypair, server: Horizon.Server) {
    this.name = name
    this.sponsor = sponsor
    this.server = server
    this.users = []
  }


  /**
   * Creates the model (accounts, trustlines) in the Stellar network 
   * for the currency to be used locally, i.e, trades between the 
   * users of this currency.
   */
  async createLocalModel() {
    // MINTX account
    const mintKeys = Keypair.random()
    
    // COINX asset
    this.asset = new Asset("COIN"+this.name, mintKeys.publicKey())
  
    // ADMINX account
    const adminKeys = Keypair.random()
    const sponsorAccount = await this.server.loadAccount(this.sponsor.publicKey())
  
    const transaction = new TransactionBuilder(sponsorAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
  
    // Sponsoring wrap
    .addOperation(Operation.beginSponsoringFutureReserves({
      sponsoredId: mintKeys.publicKey()
    }))
    // Create Minting account
    .addOperation(Operation.createAccount({
      destination: mintKeys.publicKey(),
      startingBalance: "0"
    }))
    .addOperation(Operation.endSponsoringFutureReserves({
      source: mintKeys.publicKey()
    }))
  
    // Sponsoring wrap
    .addOperation(Operation.beginSponsoringFutureReserves({
      sponsoredId: adminKeys.publicKey()
    }))
    // Create Admin account and add trustline to minting account.
    .addOperation(Operation.createAccount({
      destination: adminKeys.publicKey(),
      startingBalance: "0"
    }))
    .addOperation(Operation.changeTrust({
      source: adminKeys.publicKey(),
      asset: this.asset,
      limit: "1000000" // 1M
    }))
    .addOperation(Operation.endSponsoringFutureReserves({
      source: adminKeys.publicKey()
    }))
  
    // Fund the ADMINX account with some COINX
    .addOperation(Operation.payment({
      source: mintKeys.publicKey(),
      destination: adminKeys.publicKey(),
      asset: this.asset,
      amount: "100000" // 100K
    }))
    .setTimeout(30)
    .build()
  
    // Sign the transaction with all accounts involved and submit it to testnet.
    transaction.sign(this.sponsor, mintKeys, adminKeys)
  
    await this.server.submitTransaction(transaction)
  
    this.mint = mintKeys
    this.admin = adminKeys

    console.log(`Created MINT${this.name} account: ${mintKeys.publicKey()}`)
    console.log(`Created ADMIN${this.name} account: ${adminKeys.publicKey()}`)
    console.log(`Funded ADMIN${this.name} account with 100K COIN${this.name}`)
  
  }

  /**
   * Creates a user account for the currency.
   */
  async createUser() {
    const sponsorAccount = await this.server.loadAccount(this.sponsor.publicKey())
    const userKeys = Keypair.random()
  
    // Sponsor account is the submitter so it also pays the transaction fee.
    const transaction = new TransactionBuilder(sponsorAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(Operation.beginSponsoringFutureReserves({
      sponsoredId: userKeys.publicKey()
    }))
    // Create user account.
    .addOperation(Operation.createAccount({
      destination: userKeys.publicKey(),
      startingBalance: "0",
    }))
    // Add trustline to minting account.
    .addOperation(Operation.changeTrust({
      source: userKeys.publicKey(),
      asset: this.asset,
      limit: "10000" // 10K
    }))
    // Add ADMINX as a signer.
    .addOperation(Operation.setOptions({
      source: userKeys.publicKey(),
      signer: {
        ed25519PublicKey: this.admin.publicKey(),
        weight: 2
      }
    }))
    // Both USER and ADMINX can do payments, but only ADMINX can do high threshold (admin) operations.
    .addOperation(Operation.setOptions({
      source: userKeys.publicKey(),
      masterWeight: 1,
      lowThreshold: 1,
      medThreshold: 1,
      highThreshold: 2
    }))
    .addOperation(Operation.endSponsoringFutureReserves({
      source: userKeys.publicKey()
    }))
    // Fund the new account with some local coins from admin account.
    .addOperation(Operation.payment({
      source: this.admin.publicKey(),
      destination: userKeys.publicKey(),
      asset: this.asset,
      amount: "100" // 100 COINX
    }))
    .setTimeout(30)
    .build()
  
    // Sign and submit.
    transaction.sign(this.sponsor, userKeys, this.admin)
    await this.server.submitTransaction(transaction)
    
    // Save user account.
    this.users.push(userKeys)

    console.log(`Created USER${this.name}${this.users.length} account ${userKeys.publicKey()} with initial balance of 100 ${this.asset.code}`)
  
  }

  /** 
   * @param localCurrencyValue The price of the local currency in HOURs (the global unit of measure roughly meaning an hour of work) as a fraction (numerator, denominator).
   */
  async createExternalModel(localCurrencyValue: { n: number, d: number }) {
    const sponsorAccount = await this.server.loadAccount(this.sponsor.publicKey())
    const externalKeys = Keypair.random()

    this.externalAsset = new Asset("HOUR", externalKeys.publicKey())
    this.externalRate = localCurrencyValue

    // Sponsor account is the submitter so it also pays the transaction fee.
    const transaction = new TransactionBuilder(sponsorAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(Operation.beginSponsoringFutureReserves({
      sponsoredId: externalKeys.publicKey()
    }))
    // Create user account.
    .addOperation(Operation.createAccount({
      destination: externalKeys.publicKey(),
      startingBalance: "0",
    }))
    // Add trustline to local asset (COINX).
    .addOperation(Operation.changeTrust({
      source: externalKeys.publicKey(),
      asset: this.asset,
      limit: "100000" // 100K
    }))
    // Fund external account with some local coins from admin account.
    .addOperation(Operation.payment({
      source: this.admin.publicKey(),
      destination: externalKeys.publicKey(),
      asset: this.asset,
      amount: "10000" // 10K COINX
    }))
    // Exchange own HOUR's by local currency COINX at specified rate.
    .addOperation(Operation.createPassiveSellOffer({
      source: externalKeys.publicKey(),
      selling: this.asset,
      buying: this.externalAsset,
      amount: "10000", // 10K COINX
      price: localCurrencyValue
    }))
    .addOperation(Operation.createPassiveSellOffer({
      source: externalKeys.publicKey(),
      selling: this.externalAsset,
      buying: this.asset,
      amount: "1000", // 1K HOURs
      price: { n: localCurrencyValue.d, d: localCurrencyValue.n }
    }))
    
    .addOperation(Operation.endSponsoringFutureReserves({
      source: externalKeys.publicKey()
    }))
    .setTimeout(30)
    .build()

    // Sign and submit.
    transaction.sign(this.sponsor, externalKeys, this.admin)
    await this.server.submitTransaction(transaction)

    this.external = externalKeys

    console.log(`Created EXT${this.name} account ${externalKeys.publicKey()} for external trade.`)

  }
  /**
   * Adds a trustline to the external HOUR asset for the given limit. Also adds bidirectional sell offers to external HOUR asset.
   * @param externalCurrencyAccountPublicKey The public key of the external currency account.
   * @param limit The limit of the trustline in HOURs.
   */
  async addExternalTrust(externalCurrencyAccountPublicKey: string, limit: string) {
    const sponsorAccount = await this.server.loadAccount(this.sponsor.publicKey())
    const externalHOUR = new Asset("HOUR", externalCurrencyAccountPublicKey)

    // Sponsor account is the submitter so it also pays the transaction fee.
    const transaction = new TransactionBuilder(sponsorAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET
    })
    .addOperation(Operation.beginSponsoringFutureReserves({
      sponsoredId: this.external.publicKey()
    }))
    .addOperation(Operation.changeTrust({
      source: this.external.publicKey(),
      asset: externalHOUR,
      limit
    }))
    // Sell own HOUR's by external HOUR's at 1:1 rate for path payments.
    .addOperation(Operation.createPassiveSellOffer({
      source: this.external.publicKey(),
      selling: this.externalAsset,
      buying: externalHOUR,
      amount: limit,
      price: "1"
    }))
    .addOperation(Operation.endSponsoringFutureReserves({
      source: this.external.publicKey()
    }))
    .setTimeout(30)
    .build()

    // Sign and submit.
    transaction.sign(this.sponsor, this.external)
    await this.server.submitTransaction(transaction)

    console.log(`Added trustline and exchange liquidity from external account ${this.external.publicKey()} to external account ${externalCurrencyAccountPublicKey} for ${limit} HOURs`)

  }
}