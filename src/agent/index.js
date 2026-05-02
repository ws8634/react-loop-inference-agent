const { createBrain } = require('../brain');
const { defaultRegistry } = require('../skills');

const EXIT_CODES = {
  SUCCESS: 0,
  MAX_ITERATIONS: 1,
  ERROR: 2,
  MODEL_NOT_CONFIGURED: 3
};

class ThinkingAgent {
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 10;
    this.brainType = options.brainType || 'fake';
    this.brainConfig = options.brainConfig || {};
    this.registry = options.registry || defaultRegistry;
    this.brain = null;
    this.logger = options.logger || console;
  }

  async init() {
    this.brain = createBrain(this.brainType, this.brainConfig);
    
    if (!this.brain.isConfigured()) {
      throw new Error('模型没配上');
    }
  }

  async run(input) {
    if (!this.brain) {
      await this.init();
    }

    const state = {
      input: input,
      history: [],
      availableSkills: this.registry.list()
    };

    let iteration = 0;
    let result = null;
    let exitReason = null;

    while (iteration < this.maxIterations) {
      this.logger.log(`\n[第 ${iteration + 1} 轮思考]`);
      this.logger.log('-' .repeat(40));

      this.logger.log(`[思考阶段] 正在分析输入和历史...`);
      
      const thinkResult = await this.brain.think(state);

      if (thinkResult.type === 'finish') {
        this.logger.log(`[结束阶段] 任务完成`);
        this.logger.log(`[最终结果] ${thinkResult.content}`);
        result = thinkResult.content;
        exitReason = 'success';
        break;
      }

      if (thinkResult.type === 'think') {
        this.logger.log(`[思考输出] ${thinkResult.content}`);
        state.history.push({
          type: 'think',
          content: thinkResult.content
        });
        iteration++;
        continue;
      }

      if (thinkResult.type === 'tool_call') {
        this.logger.log(`[工具调用] 准备调用工具: ${thinkResult.tool}`);
        this.logger.log(`[参数] ${JSON.stringify(thinkResult.params)}`);

        state.history.push({
          type: 'tool_call',
          tool: thinkResult.tool,
          params: thinkResult.params
        });

        this.logger.log(`[执行阶段] 正在执行工具...`);
        const toolResult = await this.registry.execute(
          thinkResult.tool,
          thinkResult.params
        );

        if (toolResult.success) {
          this.logger.log(`[工具结果] 执行成功: ${toolResult.result}`);
          state.history.push({
            type: 'tool_result',
            tool: thinkResult.tool,
            result: toolResult.result,
            success: true
          });
        } else {
          this.logger.log(`[工具结果] 执行失败: ${toolResult.error}`);
          state.history.push({
            type: 'tool_result',
            tool: thinkResult.tool,
            error: toolResult.error,
            success: false
          });
        }

        iteration++;
        continue;
      }

      iteration++;
    }

    if (exitReason === 'success') {
      return {
        success: true,
        result: result,
        iterations: iteration + 1,
        history: state.history,
        exitCode: EXIT_CODES.SUCCESS
      };
    }

    if (iteration >= this.maxIterations) {
      this.logger.log(`\n[警告] 达到最大迭代次数 ${this.maxIterations}，任务未完成`);
      return {
        success: false,
        result: null,
        iterations: iteration,
        history: state.history,
        exitCode: EXIT_CODES.MAX_ITERATIONS,
        reason: 'max_iterations_reached'
      };
    }

    return {
      success: false,
      result: null,
      iterations: iteration,
      history: state.history,
      exitCode: EXIT_CODES.ERROR,
      reason: 'unknown'
    };
  }
}

module.exports = {
  ThinkingAgent,
  EXIT_CODES
};
