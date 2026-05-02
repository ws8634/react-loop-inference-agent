class LoopBrain {
  constructor() {
    this.name = 'loop';
  }

  isConfigured() {
    return true;
  }

  async think(state) {
    return {
      type: 'think',
      content: `迭代中... 当前历史长度: ${state.history.length}`
    };
  }
}

module.exports = LoopBrain;
