<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import api, { setAuthToken, getStoredToken } from '../api';

const mode = ref('login'); // 'login' | 'register'
const auth = reactive({ email: '', password: '' });

const user = ref(null);        // { id, email }
const books = ref([]);         // lista de livros
const form = reactive({ title: '', author: '', pages: 0, year: 0 });
const editingId = ref(null);   // id do livro em edição
const message = ref(null);
const errorMsg = ref(null);

const isLogged = computed(() => !!user.value);

function notify(ok, text) {
  if (ok) { message.value = text; errorMsg.value = null; }
  else { errorMsg.value = text; message.value = null; }
  setTimeout(() => { message.value = null; errorMsg.value = null; }, 3000);
}

// Util: salvar/recuperar user no storage (para persistir após reload)
const USER_KEY = 'user';
function persistUser(u) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}

// ---- Auth ----
async function register() {
  try {
    await api.post('/auth/register', auth);
    mode.value = 'login';
    notify(true, 'Registrado! Faça login.');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao registrar');
  }
}

async function login() {
  try {
    const { data } = await api.post('/auth/login', auth);
    setAuthToken(data.access_token);
    user.value = data.user;
    persistUser(data.user);
    await loadBooks();
    notify(true, 'Login realizado!');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao logar');
  }
}

function logout() {
  setAuthToken(null);
  user.value = null;
  persistUser(null);
  books.value = [];
}

// ---- Livros ----
async function loadBooks() {
  try {
    const { data } = await api.get('/books');
    books.value = data;
  } catch (e) {
    notify(false, 'Falha ao carregar livros');
  }
}

async function createBook() {
  try {
    const payload = {
      title: form.title,
      author: form.author,
      pages: Number(form.pages),
      year: Number(form.year)
    };
    const { data } = await api.post('/books', payload);
    books.value.unshift(data.book);
    Object.assign(form, { title: '', author: '', pages: 0, year: 0 });
    notify(true, 'Livro cadastrado!');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao criar livro');
  }
}

function startEdit(b) {
  editingId.value = b.id;
  Object.assign(form, { title: b.title, author: b.author, pages: b.pages, year: b.year });
}

async function updateBook() {
  try {
    const payload = {};
    if (form.title) payload.title = form.title;
    if (form.author) payload.author = form.author;
    if (form.pages) payload.pages = Number(form.pages);
    if (form.year || form.year === 0) payload.year = Number(form.year);

    const { data } = await api.put(`/books/${editingId.value}`, payload);
    const idx = books.value.findIndex(b => b.id === editingId.value);
    if (idx >= 0) books.value[idx] = data.book;

    editingId.value = null;
    Object.assign(form, { title: '', author: '', pages: 0, year: 0 });
    notify(true, 'Livro atualizado!');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao atualizar livro');
  }
}

async function removeBook(id) {
  if (!confirm('Remover este livro?')) return;
  try {
    await api.delete(`/books/${id}`);
    books.value = books.value.filter(b => b.id !== id);
    notify(true, 'Livro removido!');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao remover livro');
  }
}

// ---- Auto-login se tiver token salvo ----
onMounted(async () => {
  const token = getStoredToken();
  const storedUser = getStoredUser();
  if (!token) return;

  try {
    await loadBooks();
    user.value = storedUser || { email: '(logado)' };
  } catch {
    logout();
  }
});
</script>

<template>
  <main class="container">
    <h1>Biblioteca SD</h1>

    <!-- Bloco de auth -->
    <section v-if="!isLogged" class="card">
      <div class="tabs">
        <button :class="{active: mode==='login'}" @click="mode='login'">Login</button>
        <button :class="{active: mode==='register'}" @click="mode='register'">Registrar</button>
      </div>

      <label>E-mail</label>
      <input v-model="auth.email" type="email" placeholder="email@exemplo.com" />

      <label>Senha</label>
      <input v-model="auth.password" type="password" placeholder="mín. 6 caracteres" />

      <div class="actions">
        <button v-if="mode==='login'" @click="login">Entrar</button>
        <button v-else @click="register">Criar conta</button>
      </div>
    </section>

    <!-- Bloco logado -->
    <section v-else>
      <div class="topbar">
        <div><strong>Logado:</strong> {{ user?.email }}</div>
        <button @click="logout">Sair</button>
      </div>

      <div class="grid">
        <div class="card">
          <h3>{{ editingId ? 'Editar Livro' : 'Novo Livro' }}</h3>
          <input v-model="form.title" placeholder="Título" />
          <input v-model="form.author" placeholder="Autor" />
          <input v-model.number="form.pages" type="number" min="1" placeholder="Páginas" />
          <input v-model.number="form.year" type="number" placeholder="Ano" />
          <div class="actions">
            <button v-if="!editingId" @click="createBook">Salvar</button>
            <button v-else @click="updateBook">Atualizar</button>
          </div>
        </div>

        <div class="card">
          <h3>Meus livros</h3>
          <div v-if="books.length===0" class="empty">Nenhum livro ainda.</div>
          <ul class="list">
            <li v-for="b in books" :key="b.id" class="list-item">
              <div class="info">
                <div class="title">{{ b.title }}</div>
                <div class="meta">{{ b.author }} • {{ b.pages }} págs • {{ b.year }}</div>
              </div>
              <div class="row-actions">
                <button @click="startEdit(b)">Editar</button>
                <button class="danger" @click="removeBook(b.id)">Excluir</button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p v-if="message" class="ok">{{ message }}</p>
    <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
  </main>
</template>

<style>
:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
body { margin: 0; background: #fafafa; color: #222; }

.container { max-width: 900px; margin: 32px auto; padding: 0 16px; }
h1 { margin: 0 0 16px; }

.card {
  background: #fff; border: 1px solid #eee; border-radius: 12px;
  padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.04);
}

.tabs {
  display: flex;
  justify-content: center;  /* centraliza os botões dentro do card */
  gap: 8px;
  margin-bottom: 12px;
}
.tabs button { padding: 6px 10px; border-radius: 8px; border: 1px solid #ddd; background: #f6f6f6; }
.tabs .active { background: #e9f5ff; border-color: #cde8ff; }

label { display: block; margin-top: 8px; font-size: 14px; color: #444; }
input { width: 100%; padding: 8px 10px; margin-top: 4px; border: 1px solid #ddd; border-radius: 8px; }

.actions {
  margin-top: 12px;
  display: flex;
  justify-content: center; /* centraliza os botões */
  gap: 8px;
}
button { cursor: pointer; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; background: #f7f7f7; }
button:hover { background: #f0f0f0; }
button.danger { border-color: #ffd3d3; background: #ffecec; }
button.danger:hover { background: #ffe1e1; }

.topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }

.list { list-style: none; padding: 0; margin: 0; }
.list-item { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f0f0f0; }
.list-item:last-child { border-bottom: none; }
.title { font-weight: 600; }
.meta { color:#666; font-size: 14px; }

.ok { color: #1a7f37; }
.err { color: #b3261e; }
.empty { color:#666; font-size: 14px; }
.row-actions { display:flex; gap:8px; }
</style>
