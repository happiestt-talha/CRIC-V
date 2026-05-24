@echo off
REM Check if venv exists
if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe run.py
) else (
    echo Virtual environment not found! Please create a venv.
    pause
)
