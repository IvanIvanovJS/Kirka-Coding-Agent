# Kirka Backend Server

Backend server for Kirka AI Template Generator application.

## About

This is a Node.js backend server that provides RESTful API endpoints for:

- User authentication (register, login, logout)
- Template management (CRUD operations)
- Comment system
- Data persistence

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3030`

## API Endpoints

### Authentication

- `POST /users/register` - Register new user
- `POST /users/login` - Login user
- `GET /users/logout` - Logout user
- `GET /users/me` - Get current user

### Templates

- `GET /data/templates` - Get all templates
- `GET /data/templates/:id` - Get template by ID
- `POST /data/templates` - Create new template
- `PUT /data/templates/:id` - Update template
- `DELETE /data/templates/:id` - Delete template

### Comments

- `GET /data/comments` - Get all comments
- `GET /data/comments?where=templateId="${id}"` - Get comments for template
- `POST /data/comments` - Create comment
- `DELETE /data/comments/:id` - Delete comment

## Admin Panel

Access the admin panel at: `http://localhost:3030/admin`

## Data Storage

Data is stored in JSON files in the `data` directory.

## Documentation

For more information, see the [SoftUni Practice Server Documentation](https://github.com/softuni-practice-server/softuni-practice-server/blob/master/README.md)
