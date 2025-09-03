import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { summarizeText } from "./geminiClient";
import Toast from "./Toast";

function App() {
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
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

    const { data: { user } } = await supabase.auth.getUser();
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
    if (error) return showToast("Failed to delete note", "danger");

    setNotes(notes.filter((n) => n.id !== id));
    showToast("Note deleted!");
  }

  async function clearAllNotes() {
    if (!window.confirm("Delete ALL notes?")) return;

    const { error } = await supabase.from("notes").delete().neq("id", 0);
    if (error) return showToast("Failed to clear notes", "danger");

    setNotes([]);
    showToast("All notes deleted!");
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
      <div className="container text-center mt-5">
        <h2 className="mb-4">AI Notes App</h2>
        <button className="btn btn-primary" onClick={signIn}>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>AI Notes App</h2>
        <div>
          <button className="btn btn-outline-warning me-2" onClick={clearAllNotes}>
            Clear All
          </button>
          <button className="btn btn-outline-danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Write a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        <button className="btn btn-success" onClick={addNote}>
          Add
        </button>
      </div>

      <div>
        <h4>Your Notes</h4>
        {notes.length === 0 && <p className="text-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="card mb-3">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <p className="card-text">{n.content}</p>
                {n.summary && (
                  <p className="text-secondary">
                    <strong>Summary:</strong> {n.summary}
                  </p>
                )}
              </div>
              <div className="d-flex flex-column gap-2">
                {!n.summary && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => summarize(n.id, n.content)}
                    disabled={loadingId === n.id}
                  >
                    {loadingId === n.id ? "Summarizing..." : "Summarize"}
                  </button>
                )}
                <button
                  className="btn btn-outline-danger btn-sm"
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
