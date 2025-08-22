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
const busy = ref(false);       // <-- flag global de "ocupado"

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

  // Se estiver editando este livro, cancela edição e limpa o form
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
/* força tema claro e cores consistentes em qualquer sistema */
:root { 
  color-scheme: light; 
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}
body { margin: 0; background: #fafafa; color: #222; }

.container { max-width: 900px; margin: 32px auto; padding: 0 16px; }
h1 { margin: 0 0 16px; }

.card {
  background: #fff; border: 1px solid #eee; border-radius: 12px;
  padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.04);
}

/* abas login/registrar — tom claro com realce azul suave no ativo */
.tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}
.tabs button { 
  padding: 6px 10px; border-radius: 8px; 
  border: 1px solid #ddd; background: #f6f6f6; color:#111;
}
.tabs .active { background: #e9f5ff; border-color: #cde8ff; }

/* campos sempre claros (evita temas escuros do SO) */
label { display: block; margin-top: 8px; font-size: 14px; color: #444; }
input { 
  width: 100%; padding: 8px 10px; margin-top: 4px; 
  border: 1px solid #ddd; border-radius: 8px; 
  background:#fff; color:#111; 
  appearance: none; -webkit-appearance: none;
}
input::placeholder { color:#9ca3af; }

/* botões padrão (Entrar / Criar conta / etc.) */
.actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
}
button { 
  cursor: pointer; border: 1px solid #ddd; border-radius: 8px; 
  padding: 8px 12px; background: #f7f7f7; color:#111;
  transition: background-color .15s ease;
}
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

/* Botão 'Página inicial' com o MESMO tom dos demais (abaixo do card) */
.home-btn-container { display:flex; justify-content:center; margin-top:16px; }
.home-btn { font-weight: 600; } /* herda as mesmas cores de 'button' */

/* estados desabilitados (quando busy=true) */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
