<template>
  <div class="home-container">
    <h1>Bem-vindo à Biblioteca</h1>
    <p>Veja os livros mais recentes cadastrados em nossa plataforma.</p>

    <div v-if="books.length > 0" class="book-list">
      <h3>Últimos livros cadastrados</h3>
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
      <p>Para adicionar ou gerenciar seus livros, acesse o painel:</p>
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
</style>