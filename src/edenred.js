const { log } = require('cozy-konnector-libs')

const API_ROOT = 'https://user.eu.edenred.io/v1/users'

class EdenredApi {
  constructor(email, { token, clientId, clientSecret }) {
    this.email = email
    this.token = token

    const myHeaders = new Headers()
    myHeaders.append('Authorization', 'Bearer ' + token)
    myHeaders.append('X-Client-Id', clientId)
    myHeaders.append('X-Client-Secret', clientSecret)
    this.headers = myHeaders
  }

  makeRequestOptions(method, body = null) {
    return {
      method: method,
      headers: this.headers,
      redirect: 'follow',
      body: body
    }
  }

  async fetch(url, method = 'GET', body = null) {
    log('info', `req on ${url}: ${method} ${body}`)
    return await fetch(
      `${API_ROOT}/${this.email}/${url}`,
      this.makeRequestOptions(method, body)
    )
      .then(response => response.json())
      .then(jsonResponse => jsonResponse.data)
  }

  async getCards() {
    return await this.fetch(`cards?wallet_result_level=full`)
  }

  async getOperations(card) {
    const reqRes = await this.fetch(
      `accounts/${card.class}-${card.account_ref}/operations`
    );
    return reqRes.filter(op => op.status === 'success')
  }

  async getAllOperations() {
    const cards = await this.getCards()
    await Promise.all(
      cards.map(async card => {
        card.operations = await this.getOperations(card)
        for (let op of card.operations) {
          op.card = card
        }
      })
    )
    return cards
  }
}

async function getEdenredData(email, authData) {
  const api = new EdenredApi(email, authData)
  return await api.getAllOperations()
}

module.exports = {
  getEdenredData
}
