# README guide for project setup

## Step 1. Clone the repository

```bash
git clone <REPO URL>
```

'''

# To setup the frontend

## Step 1. Navigate to the frontend directory

```bash
cd frontend
```

## Step 2. Install the required node modules

```bash
npm i
```

## Step 3. Start the frontend

```bash
npm run dev
```

## Step 4. Navigate to the frontend

Open the link 'http://localhost:3000' in browser

'''

# To Setup the backend
Enter the backend directory

```bash
cd backend
```
Create the virtual environment

(For windows)
```bash
py -3.12 -m venv venv
```

(For MacOS/Linux)
```bash
python3.12 -m venv venv
```

Now activate using the following command

(For windows)
```bash
venv\Scripts\activate
```

(For MacOS/Linux)
```bash
source venv/bin/activate
```

## Step 2. Install the requirements for the backend setup

```bash
pip install -r requirements.txt
```
OR

In case of version mismatch, simply run this command 

```bash
pip install -U fastapi uvicorn pydantic supabase pymupdf pgvector sarvamai cognee
```

## Step 3. Lock working environment

Then run the following command to lock the actual working environment immediately 
```bash
pip freeze > requirements-lock.txt
```

## Step 4. Start the backend server

```bash
uvicorn app.main:app --reload --port 8000
```

'''

# Docker setup

Run the command to setup n8n

```bash
docker compose up -d
```

Navigate to url 'http://localhost:5678'
