const API_BASE_URL = 'https://api.travelmap.example'; // моковий URL, не існує насправді
const MOCK_DELAY_MS = 500; // імітація затримки мережі

// Глобальний прапорець для симуляції "немає мережі"
let isOnline = true;
export function setOnline(value) { isOnline = value; }
export function getOnline() { return isOnline; }

// Глобальний прапорець для симуляції помилки
let shouldFail = false;
export function setShouldFail(value) { shouldFail = value; }

/**
 * Імітація HTTP-запиту з затримкою.
 * @param {string} method - GET | POST | PUT | DELETE
 * @param {string} path - шлях ендпоінту
 * @param {object} body - тіло запиту (для POST/PUT)
 * @param {function} mockResponse - функція, що повертає мокові дані
 */
async function request(method, path, body, mockResponse) {
  console.log(`[API] ${method} ${API_BASE_URL}${path}`, body || '');

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!isOnline) {
        reject(new Error('Network error: offline'));
        return;
      }
      if (shouldFail) {
        reject(new Error('Server error: 500'));
        return;
      }
      try {
        const result = mockResponse(body);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, MOCK_DELAY_MS);
  });
}

export const apiClient = {
  get: (path, mockResponse) => request('GET', path, null, mockResponse),
  post: (path, body, mockResponse) => request('POST', path, body, mockResponse),
  put: (path, body, mockResponse) => request('PUT', path, body, mockResponse),
  delete: (path, mockResponse) => request('DELETE', path, null, mockResponse),
};
