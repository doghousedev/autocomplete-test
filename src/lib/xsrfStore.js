import { writable } from 'svelte/store';

// Create a writable store to hold the XSRF token
export const xsrfTokenStore = writable('');
