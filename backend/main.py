import os
from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
import datetime
from database import SessionLocal, engine, Base
from datetime import date, timedelta
from typing import Optional
import models
import bcrypt
import uuid
from fastapi.middleware.cors import CORSMiddleware
import datetime
from auth import create_access_token, get_current_user, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI()

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", ""),
]
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth Schemas ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ToggleDateRequest(BaseModel):
    log_date: date

class ToggleRequest(BaseModel):
    log_date: Optional[date] = None

class JournalRequest(BaseModel):
    log_date: date
    content: str

# ─── Auth Endpoints ──────────────────────────────────────────────────────────

@app.post("/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = models.User(email=data.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created successfully"}

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not bcrypt.checkpw(data.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(int(user.id)) # ignore
    return {"access_token": token}

@app.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email")
    return {"message": "If that email exists, a reset link has been sent"}

@app.post("/habits/{habit_id}/toggle-date")
def toggle_habit_date(habit_id: int, data: ToggleDateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        models.Habit.user_id == user.id
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    if data.log_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot mark future dates")
    existing = db.query(models.HabitLog).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.date == data.log_date
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Log removed", "marked": False}
    log = models.HabitLog(habit_id=habit_id, date=data.log_date)
    db.add(log)
    db.commit()
    return {"message": "Log added", "marked": True}

# ─── Habit Endpoints ─────────────────────────────────────────────────────────

class HabitCreate(BaseModel):
    name: str

@app.get("/habits")
def get_habits(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Habit).filter(models.Habit.user_id == user.id).all()

@app.post("/habits")
def create_habit(habit: HabitCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_habit = models.Habit(name=habit.name, user_id=user.id)
    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)
    return new_habit

@app.get("/habits/today")
def get_today_status(today: Optional[date] = None, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    habits = db.query(models.Habit).filter(models.Habit.user_id == user.id).all()
    target_date = today if today else date.today()
    done_ids = set()
    for habit in habits:
        log = db.query(models.HabitLog).filter(
            models.HabitLog.habit_id == habit.id,
            models.HabitLog.date == target_date
        ).first()
        if log:
            done_ids.add(habit.id)
    return {"done_today": list(done_ids)}

@app.post("/habits/{habit_id}/toggle")
def toggle_habit(habit_id: int, data: ToggleRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        models.Habit.user_id == user.id
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    target_date = data.log_date if data.log_date else date.today()
    existing = db.query(models.HabitLog).filter(
        models.HabitLog.habit_id == habit_id,
        models.HabitLog.date == target_date
    ).first()
    if existing:
        return {"message": "Already marked"}
    log = models.HabitLog(habit_id=habit_id, date=target_date)
    db.add(log)
    db.commit()
    return {"message": "Habit marked as done"}

@app.get("/habits/{habit_id}/logs")
def get_habit_logs(habit_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id).all()

@app.delete("/habits/{habit_id}")
def delete_habit(habit_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(models.Habit).filter(models.Habit.id == habit_id).first()
    if not habit:
        return {"error": "Habit not found"}
    db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id).delete()
    db.delete(habit)
    db.commit()
    return {"message": "Habit and logs deleted"}

@app.get("/habits/{habit_id}/streak")
def get_streak(habit_id: int, today: Optional[date] = None, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        models.Habit.user_id == user.id
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    logs = db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id).all()
    log_dates = set(log.date for log in logs)
    streak = 0
    current_day = today if today else date.today()
    while current_day in log_dates:
        streak += 1
        current_day -= timedelta(days=1)
    return {"streak": streak}

@app.get("/journal/{log_date}")
def get_journal(log_date: date, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == user.id,
        models.JournalEntry.date == log_date
    ).first()
    if not entry:
        return {"date": str(log_date), "content": ""}
    return {"date": str(entry.date), "content": entry.content}

@app.post("/journal")
def save_journal(data: JournalRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == user.id,
        models.JournalEntry.date == data.log_date
    ).first()
    if entry:
        entry.content = data.content # ignore
    else:
        entry = models.JournalEntry(user_id=user.id, date=data.log_date, content=data.content)
        db.add(entry)
    db.commit()
    return {"message": "Journal saved"}

