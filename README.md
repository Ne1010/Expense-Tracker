<<<<<<< HEAD
# Billing Site

A full-stack expense management system built with Django and React.

## Features

- User authentication (regular users and admin)
- Expense title and form management
- Dynamic form fields based on expense type
- File attachment support
- Admin approval workflow
- Responsive UI with Tailwind CSS

## Prerequisites

- Python 3.8+
- Node.js 14+
- SQL Server (or SQLite for development)
- ODBC Driver 17 for SQL Server

## Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory:
```
SECRET_KEY=your-secret-key
DEBUG=True
SQL_SERVER_DB=Billing
SQL_SERVER_HOST=your-server-name
```

4. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Usage

1. Access the application at `http://localhost:3000`
2. Log in with your credentials
3. Create expense titles and forms
4. Submit expenses for approval
5. Admin users can approve/reject expenses

## API Endpoints

- `/api/auth/login/` - User login
- `/api/expense-titles/` - CRUD operations for expense titles
- `/api/expense-forms/` - CRUD operations for expense forms
- `/api/expense-forms/{id}/update_status/` - Update expense status (admin only)

## License

MIT 
=======
# Billing-site
>>>>>>> 4816abadaf55e8bfe39c20844286c6bcaa84be52
