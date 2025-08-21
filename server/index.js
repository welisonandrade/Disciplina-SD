import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const app = express();

// ----- Middlewares base -----
app.use(express.json());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// ----- Supabase clients -----
// supabaseAdmin usa service_role (permissão elevada) — use apenas no back.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// supabaseAuth com anon para validar token de usuário (getUser)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON
);

// Rota de saúde para diagnóstico rápido
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ----- Schemas de validação -----
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const loginSchema = registerSchema;

const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  pages: z.number().int().positive(),
  year: z.number().int().min(0).max(2100),
});

// ----- Auth middleware -----
const authMiddleware = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token ausente' });

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Token inválido' });

    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Falha de autenticação' });
  }
};

// ----- Rotas de autenticação -----
app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { email, password } = parsed.data;
  const { data, error } = await supabaseAuth.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Registrado com sucesso. Faça login.' });
});

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const { email, password } = parsed.data;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Credenciais inválidas' });

  res.json({
    access_token: data.session.access_token,
    user: { id: data.user.id, email: data.user.email },
  });
});

// ----- CRUD de livros (protegido) -----
app.get('/books', authMiddleware, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('*')
    .eq('owner_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ----- Rota pública: lista todos os livros -----
app.get('/books/all', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});


app.post('/books', authMiddleware, async (req, res) => {
  // converte strings numéricas automaticamente
  const body = {
    ...req.body,
    pages: Number(req.body?.pages),
    year: Number(req.body?.year),
  };
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados do livro inválidos' });

  const payload = { ...parsed.data, owner_id: req.user.id };
  const { data, error } = await supabaseAdmin.from('books').insert(payload).select().single();
  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({ message: 'Livro criado com sucesso!', book: data });
});

app.put('/books/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const partialSchema = bookSchema.partial();
  const body = {
    ...req.body,
    pages: req.body?.pages !== undefined ? Number(req.body.pages) : undefined,
    year: req.body?.year !== undefined ? Number(req.body.year) : undefined,
  };
  const parsed = partialSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados do livro inválidos' });

  const { data: existing, error: err1 } = await supabaseAdmin
    .from('books')
    .select('id, owner_id')
    .eq('id', id)
    .single();

  if (err1 || !existing) return res.status(404).json({ error: 'Livro não encontrado' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

  const { data, error } = await supabaseAdmin
    .from('books')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Livro atualizado!', book: data });
});

app.delete('/books/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;

  const { data: existing, error: err1 } = await supabaseAdmin
    .from('books')
    .select('id, owner_id')
    .eq('id', id)
    .single();

  if (err1 || !existing) return res.status(404).json({ error: 'Livro não encontrado' });
  if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

  const { error } = await supabaseAdmin.from('books').delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Livro removido!' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
