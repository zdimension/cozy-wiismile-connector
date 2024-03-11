const { log } = require('cozy-konnector-libs')

const API_ROOT = 'https://monentreprise.wiismile.fr'

class WiiSmileApi {
  constructor(email, [phpsessid, datadome]) {
    this.email = email

    const myHeaders = new Headers()
    myHeaders.append('Accept', 'application/json')
    myHeaders.append('Accept-Language', 'fr')
    myHeaders.append('Cache-Control', 'no-cache')
    myHeaders.append('Connection', 'keep-alive')
    myHeaders.append('Cookie', `PHPSESSID=${phpsessid}; datadome=${datadome}`)
    myHeaders.append('Pragma', 'no-cache')
    myHeaders.append(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
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
      `${API_ROOT}/${url}`,
      this.makeRequestOptions(method, body)
    ).then(response => response.json())
  }

  async getCards() {
    return await this.fetch(`beneficiary/wallets/load`)
  }

  async getOperations(card) {
    const reqRes = await this.fetch(
      `beneficiary/wallets/${card.id}`
    )
    return reqRes.filter(
      op => op.type === 'operation'
    )
  }

  async getAllOperations() {
    const cards = await this.getCards()
    log('info', `Got ${cards}`)
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

async function getWiiSmileData(email, token) {
  const api = new WiiSmileApi(email, token)
  return await api.getAllOperations()
}

module.exports = {
  getWiiSmileData
}
