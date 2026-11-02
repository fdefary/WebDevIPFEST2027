const entries = {
  registration: () => import(/* webpackChunkName: 'page-registration' */ '../pages/auth/registration.js'),
  login: () => import(/* webpackChunkName: 'page-login' */ '../pages/auth/login.js'),
  resetPassword: () => import(/* webpackChunkName: 'page-reset-password' */ '../pages/auth/reset-password.js'),
  treasury: () => import(/* webpackChunkName: 'page-treasury' */ '../pages/dashboard/treasury.js'),
  delegates_relation: () => import(/* webpackChunkName: 'page-delegates-relation' */ '../pages/dashboard/delegates-relation.js'),
  delegates: () => import(/* webpackChunkName: 'page-delegates' */ '../pages/competition/delegates.js'),
  compe_manager: () => import(/* webpackChunkName: 'page-compe-manager' */ '../pages/competition/compe-manager.js'),
  delegates_sc: () => import(/* webpackChunkName: 'page-delegates-sc' */ '../pages/competition/delegates-sc.js'),
  compe_manager_sc: () => import(/* webpackChunkName: 'page-compe-manager-sc' */ '../pages/competition/compe-manager-sc.js'),
  sc_prelim: () => import(/* webpackChunkName: 'page-sc-prelim' */ '../pages/competition/sc_prelim.js'),
  login_sc: () => import(/* webpackChunkName: 'page-login-sc' */ '../pages/auth/login-sc.js'),
  ct_start: () => import(/* webpackChunkName: 'page-ct-start' */ '../pages/attendance/ct-start.js'),
  ct_finish: () => import(/* webpackChunkName: 'page-ct-finish' */ '../pages/attendance/ct-finish.js'),
  gi_start: () => import(/* webpackChunkName: 'page-gi-start' */ '../pages/attendance/gi-start.js'),
  gi_finish: () => import(/* webpackChunkName: 'page-gi-finish' */ '../pages/attendance/gi-finish.js'),
  event_attendance: () => import(/* webpackChunkName: 'page-event-attendance' */ '../pages/attendance/event-attendance.js'),
  merchandise: () => import(/* webpackChunkName: 'page-merchandise' */ '../pages/merchandise/merchandise.js'),
  merchmanager: () => import(/* webpackChunkName: 'page-merchmanager' */ '../pages/merchandise/merchmanager.js'),
  index: () => import(/* webpackChunkName: 'firebase-index' */ './index.js')
};

const entry = document.currentScript?.dataset.entry;
entries[entry]?.().catch((error) => console.error(`Could not load page entry "${entry}"`, error));
