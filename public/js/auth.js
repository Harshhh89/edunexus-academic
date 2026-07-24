const loginForm = document.querySelector('#loginForm');
const loginAlert = document.querySelector('#loginAlert');
const loginButton = document.querySelector('#loginButton');

const dashboardByRole = {
  admin: '/pages/admin-dashboard.html',
  teacher: '/pages/teacher-dashboard.html',
  parent: '/pages/parent-dashboard.html',
};

function showError(message) {
  loginAlert.textContent = message;
  loginAlert.classList.remove('d-none');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginAlert.classList.add('d-none');
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in...';

  const formData = new FormData(loginForm);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Login failed.');
    }

    localStorage.setItem('edunexusToken', result.token);
    localStorage.setItem('edunexusUser', JSON.stringify(result.user));
    window.location.href = dashboardByRole[result.user.role] || '/';
  } catch (error) {
    showError(error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});
