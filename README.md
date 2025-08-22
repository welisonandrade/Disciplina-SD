# Biblioteca Saber Democrático (SD) - Sistema Distribuído de Cadastro de Livros

Este projeto implementa um sistema distribuído de cadastro de livros com cliente e servidor separados, usando uma aplicação web simples. O sistema permite a realização de operações CRUD (criar, ler, atualizar e excluir) para gerenciar livros. O intuito foi simular um ambiente digital que democratizasse o acesso a livros.

## Tecnologias Utilizadas

- **Frontend:** Vue 3 (com Axios para consumir API e Vue Router para navegação)
- **Backend:** Node.js com Express
- **Banco de Dados/Autenticação:** Supabase (PostgreSQL + autenticação via email e senha)

## Funcionalidades

- Cadastro de livros com título, autor, quantidade de páginas e ano de publicação.
- Autenticação de usuários com login (email/senha).
- CRUD de livros via API Express, com persistência de dados no Supabase.
- Mensagens de erro e sucesso para feedback ao usuário.

## Estrutura do Repositório

- `client/` — Código do frontend em Vue.js
- `server/` — Código do backend em Node.js com Express

## Instruções de Execução

1. Instale o **Node.js** em sua máquina.
2. Crie uma conta gratuita no **Supabase** e configure o banco de dados.
3. Clone o repositório:
    ```bash
    git clone <url-do-repositorio>
    ```
4. Navegue até a pasta **client** e instale as dependências:
    ```bash
    cd client
    npm install
    ```
    Caso o Vue Router não seja instalado automaticamente, execute também:
    ```bash
    npm install vue-router@4
    ```
5. Navegue até a pasta **server** e instale as dependências:
    ```bash
    cd ../server
    npm install
    ```
6. Configure o arquivo `.env` no frontend:
    - Caso não exista, crie um arquivo `.env` na pasta `client/` com o conteúdo:
      ```
      VITE_API_BASE_URL=http://localhost:3000
      ```
    - Se for acessar o servidor em outra máquina, altere o valor para o IP ou domínio correspondente, por exemplo:
      ```
      VITE_API_BASE_URL=http://192.168.0.10:3000
      ```

7. Execute o servidor backend:
    ```bash
    cd ../server
    npm run dev
    ```
8. Execute o frontend:
    ```bash
    cd ../client
    npm run dev
    ```
9. Acesse a aplicação no navegador em [http://localhost:5173]

## Screenshots

### 1 - Tela inicial
![alt text](/Screeshots/image-1.png)

### 2 - Painel de acesso ADMIN
![alt text](/Screeshots/image-2.png)

### 3 - Dashboard do ADMIN
![alt text](/Screeshots/image-3.png)