import { Horizon, Keypair, Asset, TransactionBuilder, BASE_FEE, Networks, Operation } from "@stellar/stellar-sdk"
import { friendbot } from "./friendbot"
import { Currency } from "./currency"

// Globals
let sponsor: Keypair
let coinA: Currency
let coinB: Currency

const server = new Horizon.Server('https://horizon-testnet.stellar.org')

// run all
main()
  .then(() => console.log("All tests passed."))
  .catch((e) => {
    if (e.response && e.response.data && e.response.data.title && e.response.data.extras) {
      console.error(e.response.data.title, e.response.data.extras.result_codes)
    } else {
      console.error(e)
    }
  })

async function main() {
  console.log("\n-=< Sponsor >=-")
  sponsor = await createSponsorAccount()

  // Create local currency models.
  console.log("\n-=< Currency A >=-")
  coinA = await createCurrencyModel("A")
  console.log("\n-=< Currency B >=-")
  coinB = await createCurrencyModel("B")

  // Perform some payments between users of the same currency.
  console.log("\n-=< Test local payments >=-")
  await testLocalPayments()

  // Create external currency models. The price of COINA is 1 HOUR, COINB is 1/10 HOUR
  console.log("\n-=< External trading for currency A >=-")
  await coinA.createExternalModel({n:1, d:1})
  console.log("\n-=< External trading for currency B >=-")
  await coinB.createExternalModel({n:1, d:10})
  
  // Add mutual trust between A and B currencies.
  console.log("\n-=< Define trust between currencies A and B >=-")
  await coinA.addExternalTrust(coinB.external.publicKey(), "100")
  await coinB.addExternalTrust(coinA.external.publicKey(), "100")

  // Perform some payments between users of different currencies.
  console.log("\n-=< Test external payments >=-")
  await testExternalPayments()
}

/**
 * Create Sponsor account and fund it using freindbot.
 */
async function createSponsorAccount() {
  const keys = Keypair.random()
  console.log(`Created sponsor account: ${keys.publicKey()}`)
  await friendbot(keys.publicKey())
  return keys
}

/**
 * Create a currency model in Stellar with a given name.
 */
async function createCurrencyModel(name: string) {
  const currency = new Currency(name, sponsor, server)
  await currency.createLocalModel()

  // Create 2 test users.
  await currency.createUser()
  await currency.createUser()

  return currency
}

/*
 * Performs the payments:
 *
 * USERA1 => USERA2 (100 COINA)
 * USERA2 => USERA1 (50 COINA)
 */
async function testLocalPayments() {
  const user1 = coinA.users[0]
  const user2 = coinA.users[1]

  // User signed transactions.
  await userPay(user1, user2, "80", coinA.asset)
  await userPay(user2, user1, "40", coinA.asset)

  // Admin signed transactions.
  await adminPay(coinA.admin, user1, user2, "60", coinA.asset)
  await adminPay(coinA.admin, user2, user1, "30", coinA.asset)
}

async function testExternalPayments() {
  const userA1 = coinA.users[0]
  const userB1 = coinB.users[0]

  // Pay 2 COINA from USERA1 so USERB1 receives 20 COINB.
  await userExternalPay(userA1, coinA, userB1, coinB, "20")

  // Pay 50 COINB from USERB1 so USERA1 receives 5 COINA.
  await userExternalPay(userB1, coinB, userA1, coinA, "5")
}

async function userPay(sender: Keypair, receiver: Keypair, amount: string, asset: Asset) {
  const senderAccount = await server.loadAccount(sender.publicKey())

  const inner = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE, // sender does not have enough XLM for that.
    networkPassphrase: Networks.TESTNET
  }).addOperation(Operation.payment({
    destination: receiver.publicKey(),
    asset,
    amount
  }))
  .setTimeout(30)
  .build()
  inner.sign(sender)

  // Sponsor account pays the fee.
  const transaction = TransactionBuilder.buildFeeBumpTransaction(sponsor, BASE_FEE, inner, Networks.TESTNET)
  transaction.sign(sponsor)

  await server.submitTransaction(transaction)
  console.log(`Paid ${amount} ${asset.code} from ${sender.publicKey()} to ${receiver.publicKey()}.`)

}

async function adminPay(admin: Keypair, sender: Keypair, receiver: Keypair, amount: string, asset: Asset) {
  const adminAccount = await server.loadAccount(admin.publicKey())

  const inner = new TransactionBuilder(adminAccount, {
    fee: BASE_FEE, // admin does not have enough XLM for that.
    networkPassphrase: Networks.TESTNET
  }).addOperation(Operation.payment({
    destination: receiver.publicKey(),
    asset,
    amount
  }))
  .setTimeout(30)
  .build()
  inner.sign(admin)

  // Sponsor account pays the fee.
  const transaction = TransactionBuilder.buildFeeBumpTransaction(sponsor, BASE_FEE, inner, Networks.TESTNET)
  transaction.sign(sponsor)

  await server.submitTransaction(transaction)
  console.log(`Admin paid ${amount} ${asset.code} from ${sender.publicKey()} to ${receiver.publicKey()}.`)
}

/**
 * 
 * @param sender Sender account
 * @param receiver Receiver account
 * @param amount Amount in receiver asset
 * @param sendAsset Sender asset
 * @param receiveAsset Receiver asset
 * @param rate The price of sendAsset in receiveAsset
 */
async function userExternalPay(sender: Keypair, senderCoin: Currency, receiver: Keypair, receiverCoin: Currency, amount: string) {
  const senderAccount = await server.loadAccount(sender.publicKey())

  const sendMax = parseFloat(amount) * (receiverCoin.externalRate.n / receiverCoin.externalRate.d) * (senderCoin.externalRate.d / senderCoin.externalRate.n)
  
  const inner = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE, // sender does not have enough XLM for that.
    networkPassphrase: Networks.TESTNET
  }).addOperation(Operation.pathPaymentStrictReceive({
    source: sender.publicKey(),
    sendAsset: senderCoin.asset,
    sendMax: sendMax.toString(),
    destination: receiver.publicKey(),
    destAsset: receiverCoin.asset,
    destAmount: amount,
    path: [senderCoin.externalAsset, receiverCoin.externalAsset]
  }))
  .setTimeout(30)
  .build()
  inner.sign(sender)

  // Sponsor account pays the fee.
  const transaction = TransactionBuilder.buildFeeBumpTransaction(sponsor, BASE_FEE, inner, Networks.TESTNET)
  transaction.sign(sponsor)

  await server.submitTransaction(transaction)
  console.log(`Externally paid ${amount} ${receiverCoin.asset.code} from ${sender.publicKey()} to ${receiver.publicKey()}.`)

}