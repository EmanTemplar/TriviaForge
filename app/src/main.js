import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import './styles/main.css'
import './styles/shared/navbars.css'
import './styles/shared/scrollbars.css'
import './styles/shared/badges.css'
import './styles/shared/modals.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
