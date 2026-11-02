const entries = {
  registration: () => import(/* webpackChunkName: 'page-registration' */ './registration.js'),
  login: () => import(/* webpackChunkName: 'page-login' */ './login.js'),
  resetPassword: () => import(/* webpackChunkName: 'page-reset-password' */ './reset-password.js'),
  treasury: () => import(/* webpackChunkName: 'page-treasury' */ './treasury.js'),
  delegates_relation: () => import(/* webpackChunkName: 'page-delegates-relation' */ './delegates-relation.js'),
  delegates: () => import(/* webpackChunkName: 'page-delegates' */ './delegates.js'),
  compe_manager: () => import(/* webpackChunkName: 'page-compe-manager' */ './compe-manager.js'),
  delegates_sc: () => import(/* webpackChunkName: 'page-delegates-sc' */ './delegates-sc.js'),
  compe_manager_sc: () => import(/* webpackChunkName: 'page-compe-manager-sc' */ './compe-manager-sc.js'),
  sc_prelim: () => import(/* webpackChunkName: 'page-sc-prelim' */ './sc_prelim.js'),
  login_sc: () => import(/* webpackChunkName: 'page-login-sc' */ './login-sc.js'),
  ct_start: () => import(/* webpackChunkName: 'page-ct-start' */ './ct-start.js'),
  ct_finish: () => import(/* webpackChunkName: 'page-ct-finish' */ './ct-finish.js'),
  gi_start: () => import(/* webpackChunkName: 'page-gi-start' */ './gi-start.js'),
  gi_finish: () => import(/* webpackChunkName: 'page-gi-finish' */ './gi-finish.js'),
  event_attendance: () => import(/* webpackChunkName: 'page-event-attendance' */ './event-attendance.js'),
  merchandise: () => import(/* webpackChunkName: 'page-merchandise' */ './merchandise.js'),
  merchmanager: () => import(/* webpackChunkName: 'page-merchmanager' */ './merchmanager.js'),
  index: () => import(/* webpackChunkName: 'firebase-index' */ './index.js')
};

const entry = document.currentScript?.dataset.entry;
entries[entry]?.().catch((error) => console.error(`Could not load page entry "${entry}"`, error));
