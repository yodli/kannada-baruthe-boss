# Deploying to GitHub Pages with runtime credentials

The application reads Firebase and optional Google Cloud Text-to-Speech credentials from a small JavaScript snippet (`config/runtime-config.js`) at runtime. Because the repository ignores that file, you need to recreate it during the GitHub Pages publish step.

## 1. Create the GitHub secret

1. Navigate to **Settings → Secrets and variables → Actions** in your repository.
2. Add a new *repository secret* named `RUNTIME_CONFIG_JS` whose value is the exact contents of the runtime config file. For example:
   ```js
   window.__APP_CONFIG__ = {
     firebase: {
       apiKey: 'xxxx',
       authDomain: 'xxxx.firebaseapp.com',
       projectId: 'xxxx',
       storageBucket: 'xxxx.appspot.com',
       messagingSenderId: '1234567890',
       appId: '1:1234567890:web:abcdef',
     },
     googleTtsKey: 'optional-google-api-key'
   };
   ```

   > **Note:** Firebase configuration values are safe to expose in the client. Leave `googleTtsKey` blank if you cannot safely expose it in the browser.

## 2. Enable GitHub Pages

Enable GitHub Pages for the repository by choosing the **GitHub Actions** source in **Settings → Pages**.

## 3. GitHub Actions workflow

This branch includes `.github/workflows/deploy.yml`, which:

1. Checks out the repository.
2. Writes the `config/runtime-config.js` file from the `RUNTIME_CONFIG_JS` secret.
3. Publishes the site to GitHub Pages using the official `actions/deploy-pages` action.

The workflow fails fast with a clear error message if the secret has not been configured. Once `RUNTIME_CONFIG_JS` is populated, GitHub Pages will serve the generated `runtime-config.js` alongside the rest of the static assets so the app can initialize Firebase when it loads in production.

