// ── GORILA GYM — firebase-config.js ──────────
// Preencha com as credenciais do seu projeto Firebase.
//
// Como obter:
//   1. Acesse console.firebase.google.com
//   2. Crie um projeto (ex: "gorila-gym")
//   3. Adicione um app Web (ícone </>)
//   4. Copie o objeto firebaseConfig e cole abaixo
//   5. No Console Firebase:
//      • Authentication → Sign-in method → Anônimo → Ativar
//      • Firestore Database → Criar banco → Modo de teste
//      • Firestore → Regras → cole as regras do comentário abaixo
//
// Regras de segurança recomendadas (Firestore):
// ─────────────────────────────────────────────
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /gorila_gym/{code} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }

var FIREBASE_CONFIG = {
 apiKey: "AIzaSyDUIE98eX7xn3htBkbli9xiAhjvZSXKdwo",
  authDomain: "gorila-gym.firebaseapp.com",
  projectId: "gorila-gym",
  storageBucket: "gorila-gym.firebasestorage.app",
  messagingSenderId: "101479860054",
  appId: "1:101479860054:web:f72b6ecc6e81f21b3278f7",
  measurementId: "G-ERCYEDFWKM"
};
