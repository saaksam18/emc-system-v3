import { AxiosStatic } from 'axios';
import type { route as routeFn } from 'ziggy-js';

declare global {
    const route: typeof routeFn;
    interface Window {
        // Declares that 'axios' property exists on 'window' and its type is AxiosStatic
        axios: AxiosStatic;
    }
}
