export function LoginScreen({onLogin}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) { 
      setError("Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ùˆ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); 
      return; 
    }
    if (loading) return;
    
    setLoading(true); 
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || "Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ ÛŒØ§ Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø§Ø´ØªØ¨Ø§Ù‡ Ø§Ø³Øª (ÛŒØ§ Ø®Ø·Ø§ Ø¯Ø± Ø§Ø±ØªØ¨Ø§Ø·)");
      }
      
      if (data.user && data.user.id) {
        // Ù¾Ø§Ø³ Ø¯Ø§Ø¯Ù† ØªÙˆÚ©Ù† Ùˆ Ø¢Ø¨Ø¬Ú©Øª Ú©Ø§Ø±Ø¨Ø± Ø¨Ù‡ Ø¬Ø§ÛŒ ÙÙ‚Ø· ID
        onLogin(data.user.id, data.token, data.user);
      } else {
        throw new Error("Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆØ± Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª");
      }
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Ø®Ø·Ø§ Ø¯Ø± Ø§ØªØµØ§Ù„ Ø¨Ù‡ Ø³Ø±ÙˆØ± (Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª)" : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f5f5", fontFamily: "Tahoma, sans-serif" }}>
      <form onSubmit={handleLogin} style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "320px", textAlign: "center", direction: "rtl" }}>
        <div style={{ background: "#D4880E", width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "24px", fontWeight: "bold" }}>
          AS
        </div>
        <h2 style={{ margin: "0 0 20px", color: "#333", fontSize: "20px" }}>ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ø³ÛŒØ³ØªÙ…</h2>
        
        {error && <div style={{ background: "#FDECEA", color: "#C94B3F", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "14px" }}>{error}</div>}
        
        <input 
          type="text" 
          placeholder="Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ" 
          value={username} 
          onChange={e => setUsername(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box", direction: "ltr", outline: "none" }}
        />
        <input 
          type="password" 
          placeholder="Ø±Ù…Ø² Ø¹Ø¨ÙˆØ±" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ccc", borderRadius: "8px", boxSizing: "border-box", direction: "ltr", outline: "none" }}
        />
        
        <button type="submit" disabled={loading} style={{ width: "100%", background: "#D4880E", color: "#fff", padding: "12px", border: "none", borderRadius: "8px", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold" }}>
          {loading ? "Ø¯Ø± Ø­Ø§Ù„ ÙˆØ±ÙˆØ¯..." : "ÙˆØ±ÙˆØ¯"}
        </button>
      </form>
    </div>
  );
}
