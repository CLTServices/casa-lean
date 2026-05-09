// ============================================================
// Casa Lean — Configuração Firebase
// ============================================================
// Preencha com as credenciais do seu projecto Firebase.
// Ative também "Authentication > Email/Password" no Firebase.
// ============================================================

const firebaseConfig = {
  apiKey:            "PREENCHER",
  authDomain:        "PREENCHER.firebaseapp.com",
  projectId:         "PREENCHER",
  storageBucket:     "PREENCHER.firebasestorage.app",
  messagingSenderId: "PREENCHER",
  appId:             "PREENCHER"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
