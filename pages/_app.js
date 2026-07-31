const React = require('react');

if (typeof window !== 'undefined') {
  try {
    require('../css/style.css');
    require('../css/websocket-chat.css');
  } catch (e) {}
}

function MyApp({ Component, pageProps }) {
  return React.createElement(Component, pageProps);
}

module.exports = MyApp;
module.exports.default = MyApp;
