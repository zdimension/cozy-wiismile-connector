const {
  log,
  cozyClient,
  BaseKonnector,
  categorize
} = require('cozy-konnector-libs')
const { getEdenredData } = require('./edenred')
const { getClientTokens, getToken } = require('./auth')
const doctypes = require('cozy-doctypes')
const { Document, BankAccount, BankTransaction, BankingReconciliator } =
  doctypes

Document.registerClient(cozyClient)

const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

class EdenredConnector extends BaseKonnector {
  async fetch(fields) {
    log('info', 'Authenticating ...')
    this.authData = await getClientTokens()
    if (fields.token === undefined) {
      this.authData.token = await getToken(this, fields.login, fields.password)
    } else {
      this.authData.token = fields.token
    }
    log('info', 'Successfully logged in')

    if (this.browser) {
      await this.browser.close()
    }
    try {
      const edenredData = await getEdenredData(fields.login, this.authData)

      log('info', 'Successfully fetched data')
      log('info', 'Parsing ...')

      const accounts = this.parseAccounts(edenredData)
      const operations = this.parseOps(
        edenredData.flatMap(card => card.operations)
      )
      const categorizedTransactions = await categorize(operations)
      log('info', edenredData)
      const { accounts: savedAccounts } = await reconciliator.save(
        accounts,
        categorizedTransactions
      )

      log('info', savedAccounts)
    } catch (e) {
      log('error', e)
      log('error', e.stack)
    }
  }

  parseAccounts(cards) {
    return cards.map(card => {
      const wallet = card.wallets[0] // TODO: is there ever more than 1 wallet?
      return {
        vendorId: card.card_ref,
        number: card.card_ref,
        currency: wallet.currency,
        institutionLabel: 'Edenred',
        label: card.employer.name,
        balance: wallet.total_balance / 100,
        type: 'Checkings'
      }
    })
  }

  parseOps(ops) {
    return ops.map(op => {
      const wallet = op.transaction_details.wallets[0] // TODO: same
      return {
        vendorId: op.operation_ref,
        vendorAccountId: op.card.card_ref,
        amount: wallet.amount / 100,
        date: op.date,
        dateOperation: op.date,
        dateImport: new Date().toISOString(),
        currency: op.currency,
        label: op.outlet.name
      }
    })
  }
}

const connector = new EdenredConnector({
  cheerio: false,
  json: false
})

connector.run()
