const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  document.getElementById("status").textContent =
    "SpeechRecognition not supported in this browser.";
  throw new Error("SpeechRecognition not supported");
}

// ---- State ----
let activeSpeaker = "A";
const finalText = { A: "", B: "" };
const interimText = { A: "", B: "" };

let listening = false;

// Optional: Connect to python backend
// const socket = new WebSocket("wss://YOUR_BACKEND/ws");
const send = (msg) => {
  // if (socket.readyState === 1) socket.send(JSON.stringify(msg));
  console.log("SEND", msg);
};

// ---- UI ----
const statusEl = document.getElementById("status");
const bubbleA = document.getElementById("bubbleA");
const bubbleB = document.getElementById("bubbleB");

function render() {
    const modeText = listening ? "Listening..." : "Stopped.";
    bubbleA.textContent = (finalText.A + " " + interimText.A).trim();
    bubbleB.textContent = (finalText.B + " " + interimText.B).trim();
    statusEl.textContent = `Listening… Active speaker: ${activeSpeaker}`;
}

function switchSpeaker(to) {
  if (to === activeSpeaker) return;

  // Flush interim for previous speaker to avoid mis-assignment
  interimText[activeSpeaker] = "";
  send({ type: "flush_interim", speaker: activeSpeaker });

  activeSpeaker = to;
  send({ type: "active_speaker", speaker: activeSpeaker });

  render();
}

document.getElementById("speakerA").onclick = () => switchSpeaker("A");
document.getElementById("speakerB").onclick = () => switchSpeaker("B");

document.getElementById("stop").onclick = () => {
    listening = false;

    interimText.A = " ";
    interimText.B = " ";

    try { rec.stop(); } catch {}

    render();
}
// ---- SpeechRecognition ----
const rec = new SpeechRecognition();
rec.continuous = true;
rec.interimResults = true;
rec.lang = "en-US";

rec.onresult = (event) => {
  let newFinal = "";
  let newInterim = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const chunk = event.results[i][0].transcript;
    if (event.results[i].isFinal) newFinal += chunk;
    else newInterim += chunk;
  }

  if (newFinal) {
    finalText[activeSpeaker] = (finalText[activeSpeaker] + " " + newFinal).trim();
    interimText[activeSpeaker] = "";
    send({ type: "final", speaker: activeSpeaker, text: newFinal });
  }

  if (newInterim) {
    interimText[activeSpeaker] = newInterim.trim();
    send({ type: "partial", speaker: activeSpeaker, text: interimText[activeSpeaker] });
  }

  render();
};

rec.onerror = (e) => {
    statusEl.textContent = `Speech error: ${e.error}`;
};

// Auto-restart (often stops after silence)
rec.onend = () => {
    if (!listening) return;
    setTimeout(() => {
        try { rec.start(); } catch {}
    }, 250);
};

document.getElementById("start").onclick = () => {
    listening = true;
    try { rec.start(); } catch {}
    send({ type: "started", speaker: activeSpeaker });
    render();
};

render();