const { expect } = require('chai');
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', '..', 'src', 'cli.js');
const NODE_BIN = process.execPath;

describe('CLI 集成测试', function() {
  
  describe('帮助和基本参数', function() {
    it('--help 应该显示帮助信息并返回 0', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '--help']);
      
      expect(result.status).to.equal(0);
      expect(result.stdout.toString()).to.include('思考循环代理');
      expect(result.stdout.toString()).to.include('用法');
    });

    it('--types 应该列出模型类型', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '--types']);
      
      expect(result.status).to.equal(0);
      expect(result.stdout.toString()).to.include('fake');
      expect(result.stdout.toString()).to.include('llm');
    });

    it('没有输入应该返回错误', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH]);
      
      expect(result.status).to.equal(2);
      expect(result.stderr.toString()).to.include('错误');
    });
  });

  describe('正常执行 - 简单输入', function() {
    it('简单问候应该正常完成，返回码 0', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '你好']);
      
      expect(result.status).to.equal(0);
    });

    it('输出应该包含阶段标记', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '你好']);
      const output = result.stdout.toString();
      
      expect(output).to.include('[第 1 轮思考]');
      expect(output).to.include('[思考阶段]');
      expect(output).to.include('[结束阶段]');
      expect(output).to.include('[最终结果]');
    });
  });

  describe('正常执行 - 工具调用', function() {
    it('读取文件应该调用 memory_file 工具', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '请读取 welcome.txt 文件']);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('[工具调用]');
      expect(output).to.include('memory_file');
      expect(output).to.include('[执行阶段]');
      expect(output).to.include('[工具结果]');
      expect(output).to.include('欢迎使用思考循环代理系统');
    });

    it('计算表达式应该调用 calculator 工具', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '计算 1 + 2 * 3 等于多少']);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('[工具调用]');
      expect(output).to.include('calculator');
      expect(output).to.include('[工具结果]');
      expect(output).to.include('7');
    });
  });

  describe('返回码测试', function() {
    it('正常完成应该返回 0', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '测试']);
      expect(result.status).to.equal(0);
    });

    it('达到最大迭代次数应该返回 1', function() {
      class TestBrain {
        constructor() {
          this.name = 'test';
        }
        isConfigured() { return true; }
        async think(state) {
          return {
            type: 'think',
            content: '继续思考...'
          };
        }
      }

      const TestThinkingAgent = require('../../src/agent').ThinkingAgent;
      const { EXIT_CODES } = require('../../src/agent');
      
      class TestAgent extends TestThinkingAgent {
        async init() {
          this.brain = new TestBrain();
        }
      }

      return (async () => {
        const agent = new TestAgent({
          maxIterations: 2,
          logger: { log: () => {} }
        });

        const result = await agent.run('测试');
        expect(result.exitCode).to.equal(EXIT_CODES.MAX_ITERATIONS);
        expect(result.reason).to.equal('max_iterations_reached');
        expect(result.success).to.be.false;
      })();
    });

    it('无效输入应该返回 2', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH]);
      expect(result.status).to.equal(2);
    });

    it('使用未配置的 LLM 模型应该返回 3', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '-b', 'llm', '测试']);
      
      expect(result.status).to.equal(3);
      expect(result.stderr.toString()).to.include('模型没配上');
    });
  });

  describe('安静模式 (-q)', function() {
    it('安静模式应该只输出结果', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '-q', '你好']);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.not.include('[第 1 轮思考]');
      expect(output).to.not.include('[思考阶段]');
    });
  });

  describe('最大迭代次数 (-m)', function() {
    it('应该支持设置最大迭代次数', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '-m', '5', '你好']);
      
      expect(result.status).to.equal(0);
    });
  });
});
