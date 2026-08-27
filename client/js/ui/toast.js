export function showToast(message) {
  const region = document.querySelector('#toast-region');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  region.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 3200);
}
