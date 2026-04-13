
import { useEffect, useState } from "react";
import axios from "axios";

const getLocalToday = () => 
    {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
    };
    const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function App() {
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [newHabit, setNewHabit] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState("login"); 
  const [doneToday, setDoneToday] = useState(new Set());
  const [journalDate, setJournalDate] = useState(getLocalToday());
  const [journalContent, setJournalContent] = useState("");
  const [journalStatus, setJournalStatus] = useState("");

  const clearWeek = (id) => {
  const token = localStorage.getItem("token");
  const markedDays = habitLogs[id];
  if (!markedDays || markedDays.size === 0) return;

  const weekDays = getLast7Days();
  const toClear = weekDays.filter(d => markedDays.has(d));
  Promise.all(
    toClear.map(dateStr =>
      axios.post(`${API_URL}/habits/${id}/toggle-date`,
        { date: dateStr },
        { headers: { token } }
      )
    )
  ).then(() => {
    fetchHabitLogs(id);
    fetchHabits();
  });
};

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem("token", res.data.access_token);
      setView("app");
      fetchHabits();
    } catch (err) {
      alert("Invalid email or password");
    }
  };

  const register = async () => {
    try {
      await axios.post(`${API_URL}/register`, { email, password });
      alert("Account created! Please log in.");
      setView("login");
      setEmail("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.detail || "Registration failed");
    }
  };

  const forgotPassword = async () => {
    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      alert("If that email exists, a reset link has been sent.");
      setView("login");
      setEmail("");
    } catch (err) {
      alert(err.response?.data?.detail || "Something went wrong");
    }
  };

  const fetchHabits = () => {
  const token = localStorage.getItem("token");
  axios.get(`${API_URL}/habits`, {
    headers: { token }
  }).then(res => {
    setHabits(res.data);
    res.data.forEach(habit => {
      axios.get(`${API_URL}/habits/${habit.id}/streak`, {
        headers: { token }
      }).then(streakRes => {
        setStreaks(prev => ({ ...prev, [habit.id]: streakRes.data.streak }));
      });
      fetchHabitLogs(habit.id);
    });
  });
  axios.get(`${API_URL}/habits/today`, {
    headers: { token }
  }).then(res => {
    setDoneToday(new Set(res.data.done_today));
  });
};

  const addHabit = () => {
    if (!newHabit) return;
    axios.post(`${API_URL}/habits`, { name: newHabit }, {
      headers: { token: localStorage.getItem("token") }
    }).then(() => { setNewHabit(""); fetchHabits(); });
  };

const markDone = (id) => {
  axios.post(`${API_URL}/habits/${id}/toggle`,
    { date: getLocalToday() },
    { headers: { token: localStorage.getItem("token") } }
  ).then(fetchHabits);
};

  const deleteHabit = (id) => {
    axios.delete(`${API_URL}/habits/${id}`, {
      headers: { token: localStorage.getItem("token") }
    }).then(fetchHabits);
  };

  const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const fetchJournal = (dateStr) => {
  axios.get(`${API_URL}/journal/${dateStr}`, {
    headers: { token: localStorage.getItem("token") }
  }).then(res => {
    setJournalContent(res.data.content);
    setJournalStatus("");
  });
};

const saveJournal = () => {
  axios.post(`${API_URL}/journal`,
    { log_date: journalDate, content: journalContent },
    { headers: { token: localStorage.getItem("token") } }
  ).then(() => {
    setJournalStatus("Saved ✓");
    setTimeout(() => setJournalStatus(""), 2000);
  });
};

const selectJournalDate = (dateStr) => {
  setJournalDate(dateStr);
  fetchJournal(dateStr);
};

const [habitLogs, setHabitLogs] = useState({});

const fetchHabitLogs = (habitId) => {
  axios.get(`${API_URL}/habits/${habitId}/logs`, {
    headers: { token: localStorage.getItem("token") }
  }).then(res => {
    const dates = new Set(res.data.map(log => log.date));
    setHabitLogs(prev => ({ ...prev, [habitId]: dates }));
  });
};

const toggleDate = (habitId, dateStr) => {
  axios.post(`${API_URL}/habits/${habitId}/toggle-date`,
    { date: dateStr },
    { headers: { token: localStorage.getItem("token") } }
  ).then(() => {
    fetchHabitLogs(habitId);
    fetchHabits();
  });
};

 // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    setView("app");
    fetchHabits();
    fetchJournal(getLocalToday());
  }
}, []);

  const cardStyle = {
    background: "#ffffff", borderRadius: "20px", padding: "2.5rem 2rem",
    width: "340px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "11px 14px",
    borderRadius: "10px", border: "1.5px solid #e0e0e0", fontSize: "14px",
    color: "#111", background: "#fafafa", outline: "none"
  };

  const buttonStyle = {
    width: "100%", padding: "13px", background: "#8B7355", color: "#fff",
    border: "none", borderRadius: "10px", fontSize: "15px",
    fontWeight: "700", cursor: "pointer"
  };

  const labelStyle = {
    display: "block", fontSize: "13px", fontWeight: "600",
    color: "#333", marginBottom: "6px"
  };

  const outerStyle = {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#C8B89A",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  };

  // 🔐 LOGIN
  if (view === "login") {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "40px" }}>📈</span>
          </div>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111", margin: "0 0 6px" }}>Habit Tracker</h1>
            <p style={{ fontSize: "14px", color: "#888", margin: "0" }}>Sign in to your account</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setEmail(""); setPassword(""); setView("forgot"); }} style={{ background: "none", border: "none", fontSize: "13px", color: "#8B7355", cursor: "pointer", padding: "0", fontWeight: "500" }}>
                Forgot password?
              </button>
            </div>
            <button onClick={login} style={buttonStyle}>Login</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#aaa", margin: "1.5rem 0 0" }}>
            Don't have an account?{" "}
            <button onClick={() => { setEmail(""); setPassword(""); setView("signup"); }} style={{ background: "none", border: "none", color: "#8B7355", fontWeight: "700", cursor: "pointer", fontSize: "13px", padding: "0" }}>
              Sign up
            </button>
          </p>
        </div>
      </div>
    );
  }

  // 📝 SIGN UP
  if (view === "signup") {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "40px" }}>📈</span>
          </div>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111", margin: "0 0 6px" }}>Create Account</h1>
            <p style={{ fontSize: "14px", color: "#888", margin: "0" }}>Start tracking your habits</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={register} style={buttonStyle}>Create Account</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#aaa", margin: "1.5rem 0 0" }}>
            Already have an account?{" "}
            <button onClick={() => { setEmail(""); setPassword(""); setView("login"); }} style={{ background: "none", border: "none", color: "#8B7355", fontWeight: "700", cursor: "pointer", fontSize: "13px", padding: "0" }}>
              Log in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // 🔑 FORGOT PASSWORD
  if (view === "forgot") {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "40px" }}>🔑</span>
          </div>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111", margin: "0 0 6px" }}>Reset Password</h1>
            <p style={{ fontSize: "14px", color: "#888", margin: "0" }}>Enter your email to reset</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={forgotPassword} style={buttonStyle}>Send Reset Link</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#aaa", margin: "1.5rem 0 0" }}>
            Remember your password?{" "}
            <button onClick={() => { setEmail(""); setView("login"); }} style={{ background: "none", border: "none", color: "#8B7355", fontWeight: "700", cursor: "pointer", fontSize: "13px", padding: "0" }}>
              Log in
            </button>
          </p>
        </div>
      </div>
    );
  }

  

  return (
  <div style={{ minHeight: "100vh", background: "#C8B89A", padding: "2rem", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
    <div style={{ maxWidth: "480px", margin: "0 auto", background: "#fff", borderRadius: "20px", padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>📈</span>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111", margin: "0" }}>My Habits</h1>
        </div>
        <button
          onClick={() => { localStorage.removeItem("token"); setView("login"); }}
          style={{ background: "none", border: "1.5px solid #e0e0e0", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", color: "#888", cursor: "pointer", fontWeight: "500" }}
        >
          Logout
        </button>
      </div>
    
  {/* Add Habit */}
  <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
  <input
    placeholder="New habit..."
    value={newHabit}
    onChange={(e) => setNewHabit(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && addHabit()}
    style={{ flex: 1, padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e0e0e0", fontSize: "14px", color: "#111", background: "#fafafa", outline: "none" }}
  />
  <button
    onClick={addHabit}
    style={{ padding: "11px 20px", background: "#8B7355", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}
  >
  Add
  </button>
</div>

  {habits.map(habit => {
  const isDone = doneToday.has(habit.id);
  return (
    <div
      key={habit.id}
      style={{
        display: "flex", flexDirection: "column", gap: "12px",
        background: isDone ? "#edf7ed" : "#faf8f4",
        border: isDone ? "1.5px solid #a3d9a3" : "1.5px solid #e8e0d0",
        borderRadius: "12px", padding: "14px 16px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontWeight: "600", fontSize: "15px", color: "#111", margin: "0 0 4px" }}>
            {isDone ? "✅" : "⬜"} {habit.name}
          </p>
          <p style={{ fontSize: "13px", color: "#aaa", margin: "0" }}>
            🔥 {streaks[habit.id] || 0} day streak
          </p>
        </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => markDone(habit.id)}
          disabled={isDone}
          style={{
            padding: "7px 14px",
            background: isDone ? "#c8c8c8" : "#8B7355",
            color: "#fff", border: "none", borderRadius: "8px",
            fontSize: "13px", fontWeight: "600",
            cursor: isDone ? "default" : "pointer"
          }}
        >
          {isDone ? "Done ✓" : "✓ Done"}
        </button>
        <button
          onClick={() => clearWeek(habit.id)}
          disabled={!habitLogs[habit.id] || habitLogs[habit.id].size === 0}
          style={{
            padding: "7px 14px",
            background: "none",
            color: "#8B7355",
            border: "1.5px solid #8B7355",
            borderRadius: "8px",
            fontSize: "13px", fontWeight: "600",
            cursor: (!habitLogs[habit.id] || habitLogs[habit.id].size === 0) ? "default" : "pointer",
            opacity: (!habitLogs[habit.id] || habitLogs[habit.id].size === 0) ? 0.5 : 1
          }}
        >
          Clear All
        </button>
        <button
          onClick={() => deleteHabit(habit.id)}
          style={{ padding: "7px 14px", background: "none", color: "#cc5555", border: "1.5px solid #cc5555", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
      </div>

      <div style={{ display: "flex", gap: "4px" }}>
        {getLast7Days().map(dateStr => {
          const isMarked = habitLogs[habit.id]?.has(dateStr);
          const [year, month, day] = dateStr.split("-").map(Number);
          const dayLabel = new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short" })[0];
          return (
            <button
              key={dateStr}
              onClick={() => toggleDate(habit.id, dateStr)}
              title={dateStr}
              style={{
                flex: 1, height: "32px",
                background: isMarked ? "#8B7355" : "#f0ebe0",
                color: isMarked ? "#fff" : "#888",
                border: "none", borderRadius: "6px",
                fontSize: "11px", fontWeight: "600", cursor: "pointer"
              }}
            >
              {dayLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
})}
  {/* Journal */}
<div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1.5px solid #e8e0d0" }}>
  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
    <span style={{ fontSize: "20px" }}>📓</span>
    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111", margin: "0" }}>Journal</h2>
  </div>

  <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
    {getLast7Days().map(dateStr => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" })[0];
      const dayNum = d.getDate();
      const isSelected = journalDate === dateStr;
      return (
        <button
          key={dateStr}
          onClick={() => selectJournalDate(dateStr)}
          title={dateStr}
          style={{
            flex: 1, padding: "8px 0",
            background: isSelected ? "#8B7355" : "#f0ebe0",
            color: isSelected ? "#fff" : "#888",
            border: "none", borderRadius: "8px",
            fontSize: "11px", fontWeight: "600",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px"
          }}
        >
          <span>{dayLabel}</span>
          <span style={{ fontSize: "13px", fontWeight: "700" }}>{dayNum}</span>
        </button>
      );
    })}
  </div>

  <textarea
    value={journalContent}
    onChange={(e) => setJournalContent(e.target.value)}
    placeholder="How was your day? What went well? What would you do differently?"
    style={{
      width: "100%", boxSizing: "border-box", minHeight: "120px",
      padding: "12px 14px", borderRadius: "10px",
      border: "1.5px solid #e0e0e0", fontSize: "14px",
      color: "#111", background: "#fafafa", outline: "none",
      resize: "vertical", fontFamily: "inherit"
    }}
  />

  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
    <span style={{ fontSize: "13px", color: "#a3d9a3", fontWeight: "600" }}>{journalStatus}</span>
    <button
      onClick={saveJournal}
      style={{
        padding: "9px 20px", background: "#8B7355", color: "#fff",
        border: "none", borderRadius: "8px", fontSize: "14px",
        fontWeight: "700", cursor: "pointer"
      }}
    >
      Save Entry
    </button>
  </div>
  </div>
  </div>
  </div>
  );
}

export default App;