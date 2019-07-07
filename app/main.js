// System paths
const path = require('path')
const fs = require('fs')

// Electron
const electron = require('electron')

const globalShortcut = electron.globalShortcut
const menu = electron.Menu

// App Info
const app = electron.app
const appTitle = app.getName()
const appIsDev = require('electron-is-dev')
const appConfig = require('./lib/config.js')

// Right Click/Context menu contents
require('electron-context-menu')()

// Main App Window
let mainWindow

// If the application is quitting
let isQuitting = false

// Main Window
function createMainWindow() {

  const lastWindowState = appConfig.get('lastWindowState')
  const appView = new electron.BrowserWindow({
    title: appTitle,
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    backgroundColor: '#2b2b2b',
    titleBarStyle: 'hiddenInset',
    transparent: true,
    // frame: false,
    center: true,
    movable: true,
    resizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: { webSecurity: false }
  })


  if ( appIsDev ) {
    //appView.loadURL('http://localhost:7070')
    appView.loadURL('https://playcode.io')
  } else {
    appView.loadURL('https://playcode.io')
  }

  // When window is closed, hide window
  appView.on('close', e => {
    if ( !isQuitting ) {
      e.preventDefault()
      if ( process.platform === 'darwin' ) {
        app.hide()
      } else {
        app.quit()
      }
    }
  })

  // Enter fullscreen Playcode fullscreen method execution
  appView.on('enter-full-screen', () => {
    appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronEnteredFullscreen") );')
  })

  // Exit fullscreen Playcode fullscreen method execution
  appView.on('leave-full-screen', () => {
    appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronLeavedFullscreen") );')
  })

  return appView
}

app.on('ready', () => {
  const version = app.getVersion()

  mainWindow = createMainWindow()

  // Setting App menu
  menu.setApplicationMenu(require('./lib/menu.js'))

  // If running in developer environment = Open developer tools
  if ( appIsDev ) {
    mainWindow.openDevTools()
  }

  const appPage = mainWindow.webContents


  appPage.on('dom-ready', () => {

    console.log('Updated')

    // Make SetVersion event
    appPage.executeJavaScript(`document.dispatchEvent( new CustomEvent('setElectronVersion', {detail: {version: '${version}'}}) );`)

    // Global Style Additions
    appPage.insertCSS(fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8'))

    // MacOS ONLY style fixes
    if ( process.platform === 'darwin' ) {
      appPage.insertCSS('')
    }

    // Global Code Additions
    appPage.executeJavaScript(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'))

    // Show the Main Window
    mainWindow.show()

    // Open external links in browser
    appPage.on('new-window', ( event, url ) => {

      const hostname = (new URL(url)).hostname.toLowerCase();
      if (hostname.indexOf('accounts.google.com') !== -1) {
        // this should allow open window
        event.preventDefault();

        const win = new electron.BrowserWindow({show: false})
        win.once('ready-to-show', () => win.show())
        win.loadURL(url)
        event.newGuest = win

      } else {
        event.preventDefault();
        electron.shell.openExternal(url)
      }

    })

    // Shortcut to reload the page.
    // globalShortcut.register('CmdOrCtrl+R', (item, focusedWindow) => {
    //     if (focusedWindow) {
    //         mainWindow.webContents.reload()
    //     }
    // })
    // Shortcut to go back a page.
    // globalShortcut.register('Command+Left', ( item, focusedWindow ) => {
    //   if ( focusedWindow && focusedWindow.webContents.canGoBack() ) {
    //     focusedWindow.webContents.goBack()
    //     focusedWindow.webContents.reload()
    //   }
    // })

    // Navigate the window back when the user hits their mouse back button
    mainWindow.on('app-command', ( e, cmd ) => {
      if ( cmd === 'browser-backward' && mainWindow.webContents.canGoBack() ) {
        mainWindow.webContents.goBack()
      }
    })
  })
})

app.on('window-all-closed', () => {
  if ( process.platform !== 'darwin' ) {
    app.quit()
  }
})

app.on('activate', () => {
  mainWindow.show()
})

app.on('before-quit', () => {
  isQuitting = true

  // Saves the current window position and window size to the config file.
  if ( !mainWindow.isFullScreen() ) {
    appConfig.set('lastWindowState', mainWindow.getBounds())
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})