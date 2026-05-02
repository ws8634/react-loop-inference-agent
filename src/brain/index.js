const FakeBrain = require('./fake');
const LLMBrain = require('./llm');

const BRAIN_TYPES = {
  fake: FakeBrain,
  llm: LLMBrain
};

function createBrain(type = 'fake', config = {}) {
  const BrainClass = BRAIN_TYPES[type];
  if (!BrainClass) {
    throw new Error(`未知的模型类型: ${type}。可用类型: ${Object.keys(BRAIN_TYPES).join(', ')}`);
  }
  return new BrainClass(config);
}

function getAvailableTypes() {
  return Object.keys(BRAIN_TYPES);
}

module.exports = {
  createBrain,
  getAvailableTypes,
  FakeBrain,
  LLMBrain
};
