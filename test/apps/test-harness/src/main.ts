import { createApp } from 'vue'
import { ninjaAuth } from '@ninja/ninja-auth-js'
import ninjaVue from '@ninja/ninja-vue'
import App from './App.vue'
import router from './router'

declare const CONFIG: {
  ISSUER: string;
  CLIENT_ID: string;
  ninja_TESTING_DISABLEHTTPSCHECK: string;
}

const redirectUri = window.location.origin + '/login/callback'

const config = {
  issuer: CONFIG.ISSUER,
  redirectUri,
  clientId: CONFIG.CLIENT_ID,
  scopes: ['openid', 'profile', 'email'],
  testing: {
    disableHttpsCheck: false
  }
}

if (CONFIG.ninja_TESTING_DISABLEHTTPSCHECK) {
  config.testing = {
    disableHttpsCheck: true
  }
}

const ninjaAuth = new ninjaAuth(config)

const app = createApp(App)
app.use(router)
app.use(ninjaVue, { ninjaAuth })
app.mount('#app')
