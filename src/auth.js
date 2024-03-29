const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const { log } = require('cozy-konnector-libs')
const fs = require('fs')

const baseUrl = 'https://monentreprise.wiismile.fr'
const walletUrl = `${baseUrl}/beneficiary/wallets/`

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
      userDataDir: dataDir,
      //userDataDir: "C:\\Users\\Tom\\AppData\\Local\\Google\\Chrome\\User Data",
      //args: ['--profile-directory=Default'],
      // set a large viewport to avoid mobile version of the website
      defaultViewport: {
        width: 1366,
        height: 768
      },
      //args: ['--proxy-server=192.168.1.4:3129']
    })
    let page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    )
    await page.goto(walletUrl)
    // wait for idle
    await page.waitForTimeout(1000)
    try {
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 4000
      })
    } catch (e) {
      log('info', 'Not logged in, logging in...')
      // original auth code from @Guekka
      await page.waitForSelector('form', { timeout: 1000 })

      const form = await page.$('form')

      await form.$('input[name="username"]').then(el => el.type(username, {delay: 50}))
      await form.$('input[name="password"]').then(el => el.type(password, {delay: 50}))

      await page.waitForTimeout(1000)

      /* await form
        .waitForSelector('button[type="submit"]', { timeout: 20000 })
        .then(el => el.click())*/
      await page.waitForFunction(`window.location.href === "${walletUrl}"`, {
        timeout: 400000
      })
    }

    const tokens = await page.cookies().then(cookies => {
      return [
        cookies.find(c => c.name === 'PHPSESSID').value,
        cookies.find(c => c.name === 'datadome').value
      ]
    })

    await connector.notifySuccessfulLogin()

    await browser.close()
    return tokens
  }
}
