<template>
  <div style="margin-top: 0;" class="home-container">
    <img src="../assets/biblioteca_SD_logo.png" alt="Logo da Biblioteca" class="logo" />
    <h1>Biblioteca Saber Democrático</h1>
    <p style="padding-bottom: 1em;">A leitura que transforma, agora acessível a todos.</p>

    <div v-if="books.length > 0" class="book-list">
      <h3>Últimos livros cadastrados no acervo:</h3>
      <ul class="list">
        <li v-for="book in books" :key="book.id" class="list-item">
          <strong>{{ book.title }}</strong>
          <span class="meta"> — {{ book.author }} ({{ book.year }})</span>
        </li>
      </ul>
    </div>
    <div v-else class="empty">
      <p>Nenhum livro cadastrado até o momento.</p>
    </div>

    <div class="actions">
      <p>Para gerenciar seus livros, acesse o painel de administrador:</p>
      <router-link to="/dashboard">
        <button>Acessar Painel (Login / Registro)</button>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// 1. Importa a instância centralizada do api
import api from '../api';

const books = ref([]);

// 2. Usa onMounted, o equivalente do created/mounted no <script setup>
onMounted(async () => {
  try {
    // 3. Chama o endpoint público correto
    const { data } = await api.get('/books/all');
    books.value = data;
  } catch (error) {
    console.error("Erro ao carregar livros públicos:", error);
  }
});
</script>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;
}

.book-list {
  margin-top: 30px;
  text-align: left;
}

.list {
  list-style: none;
  padding: 0;
}

.list-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.list-item:nth-child(odd) {
  background-color: #f9f9f9;
}

.meta {
  color: #555;
}

.actions {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.actions button {
  border: none;
  border-radius: 8px;
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.actions button:hover {
  background-color: #0056b3;
}

.empty {
  margin-top: 30px;
  color: #777;
}

.logo {
  display: block;        /* garante que ocupe uma linha só */
  margin: 0 auto 5px;   /* centraliza e cria espaço abaixo */
  max-width: 140px;      /* limite de largura da logo */
  height: auto;          /* mantém proporção */
  padding-bottom: 0;
}


</style>