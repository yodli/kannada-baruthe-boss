# Security Review

This review summarizes the most relevant security risks identified in the current codebase and recommended mitigations.

## 1. Client-side "Admin" authentication bypass

* **Issue**: The admin/authoring mode is protected only by a hard-coded four-digit passcode that is checked entirely in the browser (`1104`). Anyone can view the source, discover the passcode, or call `renderAuthorEditor()` directly to unlock the privileged UI.
* **Impact**: An attacker can gain full authoring capabilities, including editing course content, importing arbitrary JSON, and triggering Firebase writes.
* **Recommendation**: Replace the client-side check with a real authentication mechanism (e.g., Firebase Authentication) and server-enforced authorization rules. At a minimum, move secrets out of the front-end and validate privileges on the backend before allowing content changes.

## 2. Unsanitized dynamic HTML from Firestore content

* **Issue**: Module titles and icon fields retrieved from Firestore are written directly into `innerHTML` to render the dashboard without sanitization. Author mode also injects values into HTML attributes without escaping.
* **Impact**: If an attacker injects HTML/JS via Firestore (for example by abusing the insecure admin mode or JSON import), the malicious markup will execute when learners load the dashboard, leading to stored XSS.
* **Recommendation**: Sanitize or escape all remote content before inserting it into the DOM. Prefer `textContent` for text nodes, and ensure any rich content is cleaned with a trusted sanitizer.

## 3. Unvalidated JSON import in author mode

* **Issue**: The authoring interface accepts arbitrary JSON and writes it straight into Firestore and IndexedDB with no schema validation.
* **Impact**: Malicious JSON can inject executable HTML (triggering XSS as above), overwrite structured data, or insert references to attacker-controlled storage objects.
* **Recommendation**: Enforce strict schema validation on imported JSON (both client-side and, ideally, server-side). Reject unknown fields, enforce type checks, and sanitize strings before persisting them.

## 4. Exposed Firebase and Google API keys

* **Issue**: Firebase configuration (including `apiKey`) and the Google Text-to-Speech key are committed to the repository and served to every client.
* **Impact**: Attackers can reuse these credentials against the Firebase project or Google APIs. Without locked-down Firebase security rules and API key restrictions, this enables data theft, quota abuse, or unauthorized writes.
* **Recommendation**: Treat the leaked keys as compromised, rotate them, and move secrets out of the repository. Configure Firebase security rules to require authenticated users for any write, and apply API key restrictions in Google Cloud.

## 5. Service worker caches third-party assets without integrity checks

* **Issue**: The service worker precaches external scripts/styles (Tailwind CDN, Inter font) by blindly fetching and caching them.
* **Impact**: If the CDN is compromised or a network attacker tampers with the response, the malicious asset is cached and served offline, persisting the attack.
* **Recommendation**: Avoid caching third-party scripts blindly. Bundle trusted assets locally or enforce Subresource Integrity (SRI) and verify responses before caching. Consider a Content Security Policy that restricts executable sources.

## Additional hardening ideas

* Add a Content Security Policy (CSP) tailored to the app to reduce the blast radius of potential XSS.
* Limit local storage of large/untrusted blobs (e.g., profile pictures) and validate image content/size before use.
* Enable dependency scanning and keep third-party libraries (Firebase SDK, DOMPurify, etc.) up to date to receive security patches.
