import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { summarizeText } from "./geminiClient";
import Toast from "./Toast";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchNotes();
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchNotes();
    });
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 3000);
  };

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: "github" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setNotes([]);
    showToast("Signed out!");
  }

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) showToast("Failed to fetch notes", "danger");
    else setNotes(data || []);
  }

  async function addNote() {
    if (!note.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return showToast("User not logged in", "danger");

    const { data, error } = await supabase
      .from("notes")
      .insert([{ user_id: user.id, content: note }])
      .select();

    if (error) return showToast("Failed to add note", "danger");

    setNotes([...data, ...notes]);
    setNote("");
    showToast("Note added!");
  }

  async function deleteNote(id) {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      showToast("Failed to delete note", "danger");
      return;
    }

    setNotes(notes.filter((n) => n.id !== id));
    showToast("Note deleted!");
  }

  async function summarize(id, content) {
    try {
      setLoadingId(id);
      const summary = await summarizeText(content);
      await supabase.from("notes").update({ summary }).eq("id", id);
      await fetchNotes();
      showToast("Note summarized!");
    } catch (err) {
      showToast("Summarization failed", "danger");
    } finally {
      setLoadingId(null);
    }
  }

  if (!session) {
    return (
      <div className="container d-flex flex-column justify-content-center align-items-center vh-100 text-center">
        <h1 className="mb-4 fw-bold text-light">🌙 AI Notes App</h1>
        <p className="text-secondary mb-4">
          Login with GitHub to create and summarize notes with AI
        </p>
        <button className="btn btn-outline-light btn-lg" onClick={signIn}>
          <i className="bi bi-github me-2"></i> Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <h2 className="fw-bold mb-0">
            <span className="purple-icon">
              <i className="bi bi-app"></i>
            </span>{" "}
            AI Notes App
          </h2>
          <span className="ms-2 text-muted-small">
            Smart note-taking with AI summaries
          </span>
        </div>
        <div>
          <button className="btn btn-sm btn-outline-light me-2">
            Clear All
          </button>
          <button className="btn btn-sm btn-link text-danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Add Note Section */}
      <div className="add-note-section mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Write your thoughts..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addNote}>
            <i className="bi bi-plus-circle me-1"></i> Add Note
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <h4 className="notes-heading mb-3">
        <i className="bi bi-star me-2"></i>Your Notes
      </h4>
      <div className="notes-container">
        {notes.length === 0 && <p className="text-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="note-card mb-3">
            <div className="note-content-container">
              <div className="note-content">
                <p className="note-text">{n.content}</p>
              </div>
              {n.summary && (
                <div className="note-summary">
                  <span className="note-summary-heading">
                    <i className="bi bi-lightbulb-fill me-1"></i>AI Summary
                  </span>
                  <p>{n.summary}</p>
                </div>
              )}
            </div>
            <div className="note-footer">
              <span className="note-timestamp">
                <i className="bi bi-clock me-1"></i>
                {new Date(n.created_at).toLocaleDateString()}
                {", "}
                {new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="note-actions">
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => summarize(n.id, n.content)}
                  disabled={loadingId === n.id}
                >
                  {loadingId === n.id ? "Summarizing..." : "Summarize"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => deleteNote(n.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}

export default App;