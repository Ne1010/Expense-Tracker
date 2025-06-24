# Billing Site

A full-stack web application designed for efficient expense management and tracking. This project allows users to submit expense forms with detailed information and attach relevant documents, which are securely stored using OneDrive integration.

## Features

- **User Management:** Secure user authentication system.
- **Expense Tracking:** Create, read, update, and delete expense entries.
- **File Uploads:** Attach receipts and other documents to each expense form.
- **OneDrive Integration:** Seamlessly stores and retrieves file attachments from Microsoft OneDrive.
- **RESTful API:** A robust backend API built with Django REST Framework to manage application data.
- **Modern Frontend:** A responsive and user-friendly interface built with React.

## Tech Stack

- **Backend:**
  - Python
  - Django & Django REST Framework
  - Microsoft Authentication Library (MSAL) for Python
- **Frontend:**
  - React.js
  - JavaScript (ES6+)
  - CSS3
- **Database:**
  - Microsoft SQL Server
  - SQLite (for development)

## Project Structure

The project is organized into two main parts:

- `backend/`: Contains the Django project, including the REST API, models, and business logic.
- `frontend/`: Contains the React application, including components, screens, and styles.

## Getting Started

### Prerequisites

- Python 3.x
- Node.js and npm
- Access to a Microsoft OneDrive account for file storage integration.

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # For Windows
    python -m venv venv
    .\venv\Scripts\activate

    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    - Create a `.env` file in the `backend/` directory.
    - Add necessary configurations like `SECRET_KEY`, database credentials, and OneDrive API keys.

5.  **Run database migrations:**
    ```bash
    python manage.py migrate
    ```

6.  **Start the development server:**
    ```bash
    python manage.py runserver
    ```
    The backend will be running at `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the required npm packages:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm start
    ```
    The frontend application will open at `http://localhost:3000` (or another specified port like 5173).

## Contributor

- Neha Sureshkumar

## License

This project is licensed under the MIT License.
