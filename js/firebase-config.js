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
  apiKey:            "COLE_AQUI",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:0000000000000000"
};
