const apiKey = 'AIzaSyCYk8so0dbT8OC9JTpa0ZEw1EUZg5J_XmM';
const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'testrest_' + Date.now() + '@example.com', password: 'Password123!', returnSecureToken: true })
})
.then(r => r.json())
.then(data => console.log('SIGNUP RESPONSE:', JSON.stringify(data, null, 2)))
.catch(err => console.error('ERROR:', err));
