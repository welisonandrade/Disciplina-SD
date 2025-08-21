import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import Dashboard from '../components/Dashboard.vue';

// 1. Define as rotas da aplicação
const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard
        // Exemplo de rota protegida (veremos depois, se precisar):
        // meta: { requiresAuth: true }
    }
];

// 2. Cria a instância do roteador
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

// 3. Exporta a instância para ser usada no main.js
export default router;