const token = localStorage.getItem('edunexusToken');
const storedUser = JSON.parse(localStorage.getItem('edunexusUser') || 'null');
const welcomeText = document.querySelector('#welcomeText');
const logoutButton = document.querySelector('[data-logout]');
const requiredRole = document.body.dataset.requiredRole;

if (!token || !storedUser) {
  window.location.href = '/';
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Session expired.');
    }

    const result = await response.json();

    if (requiredRole && result.user.role !== requiredRole) {
      throw new Error('You are not allowed to view this page.');
    }

    const verificationText = result.user.role === 'parent'
      ? ` Verification: ${result.user.verificationStatus.replace('_', ' ')}.`
      : '';

    welcomeText.textContent = `Welcome, ${result.user.fullName}.${verificationText}`;
  } catch (error) {
    localStorage.removeItem('edunexusToken');
    localStorage.removeItem('edunexusUser');
    window.location.href = '/';
  }
}

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('edunexusToken');
  localStorage.removeItem('edunexusUser');
  window.location.href = '/';
});

loadCurrentUser();
