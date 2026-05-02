#!/usr/bin/env node

const { ThinkingAgent, EXIT_CODES } = require('./agent');
const { getAvailableTypes } = require('./brain');

function parseArgs() {
  const args = process.argv.slice(2);
  
  const options = {
    input: null,
    maxIterations: 10,
    brainType: 'fake',
    quiet: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--max-iterations' || arg === '-m') {
      options.maxIterations = parseInt(args[i + 1]) || 10;
      i++;
    } else if (arg === '--brain' || arg === '-b') {
      options.brainType = args[i + 1] || 'fake';
      i++;
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else if (arg === '--types' || arg === '-t') {
      return { listTypes: true };
    } else {
      if (!options.input) {
        options.input = arg;
      }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
思考循环代理

用法: agent [选项] <输入内容>

选项:
  -m, --max-iterations <数字>  最大迭代次数 (默认: 10)
  -b, --brain <类型>            模型类型 (默认: fake)
  -q, --quiet                   安静模式，只输出结果
  -t, --types                   列出所有可用的模型类型
  -h, --help                    显示帮助信息

示例:
  agent "请帮我计算 1 + 2 * 3"
  agent -m 5 "读取 welcome.txt 文件"
  agent -b llm "复杂任务"

模型类型:
  fake  - 离线假模型（默认，无需配置）
  llm   - 真实大模型（需要配置 API_KEY）
`);
}

function listTypes() {
  console.log('可用的模型类型:');
  for (const type of getAvailableTypes()) {
    const desc = type === 'fake' 
      ? '离线假模型（默认，无需配置）' 
      : '真实大模型（需要配置 AGENT_LLM_API_KEY 环境变量）';
    console.log(`  ${type} - ${desc}`);
  }
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.listTypes) {
    listTypes();
    process.exit(0);
  }

  if (!options.input) {
    console.error('错误: 请提供输入内容');
    console.error('使用 --help 查看帮助信息');
    process.exit(EXIT_CODES.ERROR);
  }

  const logger = options.quiet 
    ? { log: () => {}, error: console.error }
    : console;

  try {
    const agent = new ThinkingAgent({
      maxIterations: options.maxIterations,
      brainType: options.brainType,
      logger: logger
    });

    const result = await agent.run(options.input);

    if (options.quiet && result.success) {
      console.log(result.result);
    }

    process.exit(result.exitCode);
  } catch (error) {
    if (error.message === '模型没配上') {
      console.error('错误: 模型没配上');
      console.error('如果使用 llm 模型，请设置 AGENT_LLM_API_KEY 环境变量');
      process.exit(EXIT_CODES.MODEL_NOT_CONFIGURED);
    } else {
      console.error(`错误: ${error.message}`);
      process.exit(EXIT_CODES.ERROR);
    }
  }
}

main().catch(error => {
  console.error('未预期的错误:', error);
  process.exit(EXIT_CODES.ERROR);
});
