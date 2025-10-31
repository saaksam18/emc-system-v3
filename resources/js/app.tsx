import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import axios from 'axios'; // 1. Import Axios
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

// --- Add this section to configure Axios ---
window.axios = axios;

// Configure Axios defaults for CSRF protection and cookies
// This is what Laravel's default bootstrap.js usually handles
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

const appName = import.meta.env.VITE_APP_NAME || 'EMC';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#15406A',
        showSpinner: true,
    },
});

// This will set light / dark mode on load...
initializeTheme();
