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

    it('--types 应该列出模型类型（包括 loop）', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '--types']);
      
      expect(result.status).to.equal(0);
      expect(result.stdout.toString()).to.include('fake');
      expect(result.stdout.toString()).to.include('llm');
      expect(result.stdout.toString()).to.include('loop');
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

  describe('返回码测试 - 使用真实子进程', function() {
    it('正常完成应该返回 0', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '测试']);
      expect(result.status).to.equal(0);
    });

    it('使用 loop brain + -m 2 应该返回 1 并输出迭代超限警告', function() {
      const result = spawnSync(NODE_BIN, [CLI_PATH, '-b', 'loop', '-m', '2', '测试']);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(1);
      expect(output).to.include('[警告]');
      expect(output).to.include('达到最大迭代次数');
      expect(output).to.include('2');
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

  describe('工具拒绝测试 - 使用真实子进程', function() {
    it('memory_file 脏路径被拒应该在 stdout 输出拒绝信息', function() {
      const dirtyPathInput = ':::memory_file:::{"filename":"../secret.txt"}';
      const result = spawnSync(NODE_BIN, [CLI_PATH, dirtyPathInput]);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('[工具调用]');
      expect(output).to.include('memory_file');
      expect(output).to.include('[工具结果]');
      expect(output).to.include('非法的文件路径');
      expect(output).to.include('任务失败');
    });

    it('memory_file 绝对路径被拒应该在 stdout 输出拒绝信息', function() {
      const dirtyPathInput = ':::memory_file:::{"filename":"/etc/passwd"}';
      const result = spawnSync(NODE_BIN, [CLI_PATH, dirtyPathInput]);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('非法的文件路径');
    });

    it('calculator 除零被拒应该在 stdout 输出拒绝信息', function() {
      const divByZeroInput = ':::calculator:::{"expression":"10 / 0"}';
      const result = spawnSync(NODE_BIN, [CLI_PATH, divByZeroInput]);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('[工具调用]');
      expect(output).to.include('calculator');
      expect(output).to.include('[工具结果]');
      expect(output).to.include('除零错误');
      expect(output).to.include('任务失败');
    });

    it('calculator 嵌套括号被拒应该在 stdout 输出拒绝信息', function() {
      const nestedParenInput = ':::calculator:::{"expression":"((1 + 2))"}';
      const result = spawnSync(NODE_BIN, [CLI_PATH, nestedParenInput]);
      const output = result.stdout.toString();
      
      expect(result.status).to.equal(0);
      expect(output).to.include('[工具调用]');
      expect(output).to.include('calculator');
      expect(output).to.include('不支持嵌套括号');
      expect(output).to.include('任务失败');
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
