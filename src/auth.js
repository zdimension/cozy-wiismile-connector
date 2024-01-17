const puppeteer = require('puppeteer')
const { log } = require('cozy-konnector-libs')
const fs = require('fs')

const baseUrl = 'https://team.swile.co'
const walletUrl = `${baseUrl}/wallets`

module.exports = {
  getToken: async function (connector, username, password) {
    log('info', 'Get token')
    let dataDir = `./data/${username}`
    // create data dir if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    let browser = await puppeteer.launch({
      headless: false,
      userDataDir: dataDir
    })
    let page = await browser.newPage()
    await page.goto(walletUrl)
    try {
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 1000
      })
    } catch (e) {
      // original auth code from @Guekka
      await page.waitForSelector('form', { timeout: 1000 })

      const form = await page.$('form')

      // reject cookies
      await page
        .waitForSelector('#onetrust-reject-all-handler', { timeout: 30000 })
        .then(el => el.click())

      await form.$('input[name="username"]').then(el => el.type(username))
      await form.$('input[name="password"]').then(el => el.type(password))

      await page.waitForTimeout(1000)

      await form
        .waitForSelector('button[type="submit"]', { timeout: 20000 })
        .then(el => el.click())
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 40000
      })
    }

    const jwt = await page.cookies().then(cookies => {
      return cookies.find(c => c.name === 'lunchr:jwt').value
    })

    await connector.notifySuccessfulLogin()

    await browser.close()
    return jwt
  }
}
