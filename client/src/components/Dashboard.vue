<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import api, { setAuthToken, getStoredToken } from '../api';

const mode = ref('login'); // 'login' | 'register'
const auth = reactive({ email: '', password: '' });

const user = ref(null);        // { id, email }
const books = ref([]);         // lista de livros
const form = reactive({ title: '', author: '', pages: '', year: '' });
const editingId = ref(null);   // id do livro em edição
const message = ref(null);
const errorMsg = ref(null);
const busy = ref(false);       // flag de "ocupado" geral

const isLogged = computed(() => !!user.value);

function notify(ok, text) {
  if (ok) { message.value = text; errorMsg.value = null; }
  else { errorMsg.value = text; message.value = null; }
  setTimeout(() => { message.value = null; errorMsg.value = null; }, 3000);
}

// storage do usuário logado
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
  if (busy.value) return;
  busy.value = true;
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
  } finally {
    busy.value = false;
  }
}

function startEdit(b) {
  if (busy.value) return;
  editingId.value = b.id;
  Object.assign(form, { title: b.title, author: b.author, pages: b.pages, year: b.year });
}

async function updateBook() {
  if (!editingId.value || busy.value) return;
  busy.value = true;
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
  } finally {
    busy.value = false;
  }
}

async function removeBook(id) {
  if (!confirm('Remover este livro?')) return;

  // se estiver editando este mesmo livro, sai do modo de edição
  if (editingId.value === id) {
    editingId.value = null;
    Object.assign(form, { title: '', author: '', pages: 0, year: 0 });
  }

  busy.value = true;
  try {
    await api.delete(`/books/${id}`);
    books.value = books.value.filter(b => b.id !== id);
    notify(true, 'Livro removido!');
  } catch (e) {
    notify(false, e?.response?.data?.error || 'Erro ao remover livro');
  } finally {
    busy.value = false;
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
    <!-- volta para o nome padrão na interface -->
    <img src="../assets/biblioteca_SD_logo.png" alt="Logo da Biblioteca" class="logo" />
    <h1>Biblioteca SD</h1>
    <h4 class="msg-inicio">(restrito à administradores)</h4>

    <!-- Bloco de auth -->
    <section v-if="!isLogged" class="card">
      <div class="tabs">
        <button :class="{active: mode==='login'}" @click="mode='login'">Login</button>
        <button :class="{active: mode==='register'}" @click="mode='register'">Registrar</button>
      </div>

      <label style="font-weight: bold;">E-mail</label>
      <input v-model="auth.email" type="email" placeholder="email@exemplo.com" />

      <label style="font-weight: bold;">Senha</label>
      <input v-model="auth.password" type="password" placeholder="mín. 6 caracteres" />

      <div class="actions">
        <button v-if="mode==='login'" @click="login">Entrar</button>
        <button v-else @click="register">Criar conta</button>
      </div>
    </section>

    <!-- Botão 'Página inicial' abaixo do card, centralizado e no mesmo tom -->
    <div v-if="!isLogged" class="home-btn-container">
      <router-link to="/">
        <button class="home-btn">Página inicial</button>
      </router-link>
    </div>

    <!-- Bloco logado -->
    <section v-else>
      <div class="topbar">
        <div><strong>Logado:</strong> {{ user?.email }}</div>
        <button @click="logout">Sair</button>
      </div>

      <div class="grid">
        <div class="card">
          <h3>{{ editingId ? 'Editar Livro' : 'Novo Livro' }}</h3>
          <input v-model="form.title" placeholder="Título" :disabled="busy" />
          <input v-model="form.author" placeholder="Autor" :disabled="busy" />
          <input v-model.number="form.pages" type="number" min="1" placeholder="Páginas" :disabled="busy" />
          <input v-model.number="form.year" type="number" placeholder="Ano" :disabled="busy" />
          <div class="actions">
            <button v-if="!editingId" @click="createBook" :disabled="busy">Salvar</button>
            <button v-else @click="updateBook" :disabled="busy">Atualizar</button>
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
                <button @click="startEdit(b)" :disabled="busy">Editar</button>
                <button class="danger" @click="removeBook(b.id)" :disabled="busy">Excluir</button>
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
/* Paleta e tema claro forçado (consistência em qualquer SO/navegador) */
:root {
  color-scheme: light;
  --bg: #fafafa;
  --card: #ffffff;
  --text: #111111;
  --muted: #444444;
  --border: #dddddd;
  --shadow: rgba(0,0,0,.04);

  --btn-bg: #f7f7f7;
  --btn-hover: #f0f0f0;

  --tab-active-bg: #e9f5ff;
  --tab-active-border: #cde8ff;

  --danger-bg: #ffecec;
  --danger-hover: #ffe1e1;
  --danger-border: #ffd3d3;

  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

body { margin: 0; background: var(--bg); color: var(--text); }

.container { max-width: 900px; margin: 32px auto; padding: 0 16px; }
h1 { margin: 0 0 16px; }

.card {
  background: var(--card); border: 1px solid #eee; border-radius: 12px;
  padding: 16px; box-shadow: 0 1px 2px var(--shadow);
}

/* abas login/registrar */
.tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 1em;
}
.tabs button {
  padding: 6px 10px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--btn-bg); color: var(--text);
  appearance: none; -webkit-appearance: none;
}
.tabs .active { background: var(--tab-active-bg); border-color: var(--tab-active-border); }

/* campos sempre claros */
label { display: block; margin-top: 8px; font-size: 14px; color: var(--muted);  text-align: left;}
input {
  width: 100%; padding: 8px 10px; margin-top: 4px;
  border: 1px solid var(--border); border-radius: 8px;
  background: #fff; color: var(--text);
  appearance: none; -webkit-appearance: none;
  box-sizing: border-box;
}
input::placeholder { color:#9ca3af; }

/* botões padrão (Entrar / Criar conta / Editar / etc.) */
.actions { margin-top: 12px; display: flex; justify-content: center; gap: 8px; padding-top: 1em;}

button, .home-btn {
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--btn-bg);
  color: var(--text);
  transition: background-color .15s ease, border-color .15s ease;
  appearance: none; -webkit-appearance: none; /* evita botão preto em iOS/tema escuro */
}
button:hover, .home-btn:hover { background: var(--btn-hover); }

button.danger {
  border-color: var(--danger-border);
  background: var(--danger-bg);
}
button.danger:hover { background: var(--danger-hover); }

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

/* Botão 'Página inicial' igual aos demais, abaixo do card */
.home-btn-container { display:flex; justify-content:center; margin-top:16px; }
.home-btn { font-weight: 600; }

/* estados desabilitados (quando busy=true) */
button:disabled { opacity: 0.6; cursor: not-allowed; }
input:disabled { background: #f3f4f6; color: #6b7280; }

.logo {
  display: block;        /* garante que ocupe uma linha só */
  margin: 0 auto 5px;   /* centraliza e cria espaço abaixo */
  max-width: 110px;      /* limite de largura da logo */
  height: auto;          /* mantém proporção */
  padding-bottom: 0;
}

.msg-inicio {
  font-size: 0.9em;
  color: #666;
  text-align: center;
  margin-top: -10px;
}
</style>
