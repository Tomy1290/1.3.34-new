import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function App() {
  const [hello, setHello] = useState("...");
  const [chat, setChat] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/`);
        setHello(res.data?.message || "OK");
      } catch (e) {
        setHello("Backend unreachable");
        console.error(e);
      }
    })();
  }, []);

  const triggerGreeting = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, {
        mode: "greeting",
        language: "de",
        summary: { sleep: "ok", water: "low" },
      });
      setChat(res.data?.text || "");
    } catch (e) {
      console.error(e);
      setChat("Fehler beim Chat-Endpunkt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f10", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ margin: 0 }}>Scarletts Gesundheitstracking</h1>
        <p style={{ opacity: 0.8 }}>
          Mobile-Frontend aus dem Repo ist Expo-basiert und läuft in dieser Umgebung nicht. Diese Web-Platzhalter-Seite verbindet sich mit dem neuen Backend.
        </p>
        <div style={{ marginTop: 16, padding: 12, background: "#151517", borderRadius: 8 }}>
          <div>Backend check: <strong>{hello}</strong></div>
          <button onClick={triggerGreeting} disabled={loading} style={{ marginTop: 12, padding: "8px 12px", background: "#61dafb", color: "#000", border: 0, borderRadius: 6, cursor: "pointer" }}>
            {loading ? "Lade..." : "Kurzen Gesundheitstipp holen"}
          </button>
          {chat && (
            <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{chat}</p>
          )}
        </div>
      </div>
    </div>
  );
}