import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Certifique-se que o caminho está correto
import './style.css'

// 1. Cria a instância do app
const app = createApp(App)

// 2. Usa os plugins (neste caso, o router)
app.use(router)

// 3. Monta o app no elemento #app
app.mount('#app')