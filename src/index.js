const {
  log,
  cozyClient,
  BaseKonnector,
  categorize
} = require('cozy-konnector-libs')
const { getWiiSmileData } = require('./wiismile')
const { getToken } = require('./auth')
const doctypes = require('cozy-doctypes')
const { Document, BankAccount, BankTransaction, BankingReconciliator } =
  doctypes

Document.registerClient(cozyClient)

const minilog = require('@cozy/minilog')
minilog.suggest.allow('cozy-client', 'info')

const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

class WiiSmileConnector extends BaseKonnector {
  async fetch(fields) {
    if (process.env.NODE_ENV !== 'standalone') {
      cozyClient.new.login()
    }

    if (this.browser) {
      await this.browser.close()
    }
    try {
      const token = await getToken(this, fields.login, fields.password)
      const cards = await getWiiSmileData(fields.login, token)

      log('info', 'Successfully fetched data')
      log('info', 'Parsing ...')

      const accounts = this.parseAccounts(cards)
      const operations = this.parseOps(cards.flatMap(card => card.operations))

      const categorizedTransactions = await categorize(operations)
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
      return {
        vendorId: card.id,
        number: card.id.toString(),
        currency: 'EUR',
        institutionLabel: 'WiiSmile',
        label: card.category.label,
        balance: card.amount,
        type: 'Checkings'
      }
    })
  }

  parseOps(ops) {
    return ops.map(op => {
      return {
        vendorId: op.id,
        vendorAccountId: op.card.id,
        amount: op.amount,
        date: op.date,
        dateOperation: op.date,
        dateImport: new Date().toISOString(),
        currency: 'EUR',
        label: op.label,
        originalBankLabel: op.label
      }
    })
  }
}

const connector = new WiiSmileConnector({
  cheerio: false,
  json: false
})

connector.run()
