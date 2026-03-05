module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  testRegex: '(/__tests__/.*|(\.|/)(test|spec))\.(jsx?|tsx?)$',
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    // 映射 Obsidian 模块，因为 Jest 无法直接导入 'obsidian'
    obsidian: '<rootDir>/tests/__mocks__/obsidian.ts',
  },
};
