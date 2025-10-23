![ThoughtLane](public/logo.jpg "Logo")

A full-stack blogging platform where users can create, share, and engage with articles and blogs.

## Features

- **User Authentication** - with JWT
- **Rich Text Editor** - Create and edit posts with a powerful WYSIWYG editor
- **Media Uploads** - using Supabase Storage
- **Tagging System** - Organize posts with multiple tags, search and filter by tags

## Tech Stack
 
- **Supabase** - PostgreSQL database and storage (for media)
- React, Node.js, Express.js

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/raunak-bagaria/ThoughtLane.git
cd ThoughtLane
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory according to [`.env.example`](./.env.example) :
```**env**
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_BUCKET_NAME=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
```

4. Set up the database:
On your Supabase project, run the SQL scripts in the [`database_schema/`](./database_schema) folder:
- [`create.sql`](./database_schema/create.sql) - Creates all tables and constraints
- [`bucket_policies.sql`](./database_schema/bucket_policies.sql) - Sets up storage policies

5. Run the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:4000
- Backend: http://localhost:3000

## Project Structure

```
ThoughtLane/
├── api/                    # Backend Express server
│   ├── services/
│   │   ├── UserService.js
│   │   ├── PostService.js
│   │   ├── TagService.js
│   │   ├── CommentService.js
│   │   ├── LikeService.js
│   │   └── StorageService.js
│   ├── index.js           # Main server file with routes
│   └── supabase.js        # Supabase client configuration
├── src/                   # Frontend React app
│   ├── components/        # Reusable components
│   │   └── TagInput.js
│   ├── pages/             # Page components
│   │   ├── IndexPage.js
│   │   ├── PostPage.js
│   │   ├── CreatePost.js
│   │   ├── EditPost.js
│   │   ├── LoginPage.js
│   │   └── RegisterPage.js
│   ├── config/            
│   ├── App.js             # Main app component
│   └── index.js           # Entry point
├── database_schema/
└── public/                # Static assets

```