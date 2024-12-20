import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// Store session cookies and XSRF token
let sessionCookies = null;
let xsrfToken = null;
const xsrfTokenStore = new Map();

// Debug logging function
function debugLog(title, ...args) {
  console.log('\n🔍', `[${new Date().toISOString()}]`, title);
  args.forEach(arg => {
    if (typeof arg === 'object') {
      console.log(JSON.stringify(arg, null, 2));
    } else {
      console.log(arg);
    }
  });
  console.log('-------------------');
}

// Enable CORS for our Vite dev server
app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  debugLog('Incoming Request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Auto-login function
async function autoLogin() {
  debugLog('Attempting Auto-login');
  const loginUrl = 'https://net-av.agileappscloud.com/networking/rest/login';
  const loginPayload = {
    platform: {
      login: {
        userName: "rmbaylin",
        password: "Bambam1962$$##"
      }
    }
  };

  try {
    debugLog('Sending login request to:', loginUrl);
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginPayload)
    });

    debugLog('Login Response Headers:', response.headers.raw());

    // Store cookies from response
    sessionCookies = response.headers.raw()['set-cookie'];
    if (sessionCookies) {
      debugLog('Received Cookies:', sessionCookies);
    }

    const data = await response.json();
    debugLog('Login Response Data:', data);

    // Get XSRF token from response data
    if (data?.platform?.user?.xsrfToken) {
      xsrfToken = data.platform.user.xsrfToken;
      debugLog('Using XSRF Token from response:', xsrfToken);
      // Update the store with the XSRF token
      xsrfTokenStore.set(xsrfToken);
    }

    return data;
  } catch (error) {
    debugLog('Auto-login Error:', error);
    throw error;
  }
}

// Proxy middleware for REST API calls
app.use('/api', async (req, res) => {
  // If we don't have a session, try to login
  if (!sessionCookies) {
    debugLog('No session found, attempting auto-login');
    try {
      await autoLogin();
    } catch (error) {
      debugLog('Auto-login failed in middleware:', error);
      res.status(500).json({ error: 'Auto-login failed', details: error.message });
      return;
    }
  }

  const baseUrl = 'https://net-av.agileappscloud.com/networking/rest/record/';
  const targetUrl = baseUrl + req.url;
  debugLog('Proxying request to:', targetUrl);

  try {
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Cookie': sessionCookies?.join('; '),
      'X-XSRF-TOKEN': xsrfToken
    };
    debugLog('Request Headers:', requestHeaders);

    // Forward the request to the actual API with our session
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    debugLog('Proxy Response Status:', response.status);
    debugLog('Proxy Response Headers:', response.headers.raw());

    // Forward cookies to client
    if (sessionCookies) {
      sessionCookies.forEach(cookie => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    // Forward XSRF token as cookie
    if (xsrfToken) {
      res.setHeader('Set-Cookie', `XSRF-TOKEN=${xsrfToken}; Path=/; SameSite=Lax`);
    }

    const data = await response.json();
    debugLog('Proxy Response Data:', data);
    res.json(data);
  } catch (error) {
    debugLog('Proxy Error:', error);
    // If we get an auth error, try to login again
    if (error.message.includes('401') || error.message.includes('403')) {
      debugLog('Auth error detected, clearing session');
      sessionCookies = null;
      xsrfToken = null;
      res.status(401).json({ error: 'Session expired, will retry' });
    } else {
      res.status(500).json({ error: 'Proxy error', details: error.message });
    }
  }
});

// Start server and auto-login
app.listen(PORT, async () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  try {
    await autoLogin();
    console.log('✅ Auto-login completed\n');
    // Set XSRF token in store after successful login
    xsrfTokenStore.set(xsrfToken);
  } catch (error) {
    console.error('❌ Initial auto-login failed:', error);
  }
});
