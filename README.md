# Presupuestador-Mandatarios

## Configuración de autenticación

1. Creá un proyecto en Firebase Console.
2. Habilitá **Authentication > Sign-in method > Email/Password**.
3. Creá al menos un usuario desde **Authentication > Users**.
4. Creá una aplicación web y copiá su configuración en `firebase-config.js`.
5. Publicá el contenido de `firestore.rules` en **Firestore Database > Rules**.

Ejemplo:

```javascript
window.GESTORIA_FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  appId: '...'
};
```

Cada usuario solo puede leer y modificar sus presupuestos dentro de
`artifacts/<appId>/users/<uid>/presupuestos`.