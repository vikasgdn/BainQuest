/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);
require('react-native-reanimated').setUpTests();
