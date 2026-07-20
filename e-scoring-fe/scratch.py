import os

# 1. Update LoginView.vue
login_path = 'src/views/LoginView.vue'
with open(login_path, 'r', encoding='utf-8') as f:
    login_content = f.read()

old_logo = '<Zap class="logo-icon icon-pulse" size="32" style="color: var(--color-accent-400);" />'
new_logo = '<img src="/logo-pnl.png" alt="PNL Logo" class="logo-icon icon-pulse" style="width: 48px; height: 48px; object-fit: contain;" />'
login_content = login_content.replace(old_logo, new_logo)
login_content = login_content.replace('Smart Automated Grade For Essay', 'Smart Automation Grading for Essay')

with open(login_path, 'w', encoding='utf-8') as f:
    f.write(login_content)

# 2. Append to main.css
css_path = 'src/assets/main.css'
css_append = '''
/* ===================================================
   Responsive Mobile Media Queries
   =================================================== */
@media (max-width: 768px) {
  .admin-layout, .page-layout { flex-direction: column; }
  .sidebar { width: 100% !important; height: auto !important; position: static !important; border-right: none !important; border-bottom: 1px solid var(--color-border); }
  .sidebar-nav { display: flex; overflow-x: auto; padding: 0.5rem; gap: 0.5rem; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
  .nav-item { padding: 0.5rem; justify-content: center; flex: 0 0 auto; }
  .nav-label, .auth-section, #btn-toggle-sidebar { display: none !important; }
  .sidebar-header { height: auto; padding: 0.75rem; }
  .brand-text { display: flex !important; }
  .sidebar-footer { flex-direction: row; justify-content: space-between; padding: 0.75rem; }
  .stats-grid, .ujian-grid { grid-template-columns: 1fr !important; }
  .form-row { flex-direction: column; }
  .table-wrapper { overflow-x: auto; display: block; width: 100%; }
  .navbar { padding: 0.75rem; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
  .nav-actions { width: 100%; justify-content: space-between; }
  .login-container { padding: 0.75rem; }
  .login-card { padding: 1rem !important; }
}
'''
with open(css_path, 'a', encoding='utf-8') as f:
    f.write('\n' + css_append)
print('Done!')
