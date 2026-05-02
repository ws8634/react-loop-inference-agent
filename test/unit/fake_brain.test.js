const { expect } = require('chai');
const { FakeBrain, LLMBrain, createBrain } = require('../../src');

describe('Brain 模块', function() {
  
  describe('FakeBrain', function() {
    let brain;

    beforeEach(function() {
      brain = new FakeBrain();
    });

    describe('isConfigured', function() {
      it('应该始终返回 true', function() {
        expect(brain.isConfigured()).to.be.true;
      });
    });

    describe('think', function() {
      it('应该识别文件读取请求并返回工具调用', async function() {
        const state = {
          input: '请读取 welcome.txt 文件',
          history: [],
          availableSkills: []
        };

        const result = await brain.think(state);
        
        expect(result.type).to.equal('tool_call');
        expect(result.tool).to.equal('memory_file');
        expect(result.params.filename).to.equal('welcome.txt');
      });

      it('应该识别计算请求并返回工具调用', async function() {
        const state = {
          input: '计算 1 + 2 等于多少',
          history: [],
          availableSkills: []
        };

        const result = await brain.think(state);
        
        expect(result.type).to.equal('tool_call');
        expect(result.tool).to.equal('calculator');
      });

      it('收到工具结果后应该返回 finish', async function() {
        const state = {
          input: '计算 1 + 2',
          history: [
            {
              type: 'tool_result',
              tool: 'calculator',
              result: 3,
              success: true
            }
          ],
          availableSkills: []
        };

        const result = await brain.think(state);
        
        expect(result.type).to.equal('finish');
        expect(result.content).to.include('3');
      });

      it('对于一般输入应该返回 finish', async function() {
        const state = {
          input: '你好',
          history: [],
          availableSkills: []
        };

        const result = await brain.think(state);
        
        expect(result.type).to.equal('finish');
      });
    });
  });

  describe('LLMBrain', function() {
    describe('isConfigured', function() {
      it('没有 API Key 时应该返回 false', function() {
        const brain = new LLMBrain();
        expect(brain.isConfigured()).to.be.false;
      });

      it('有 API Key 时应该返回 true', function() {
        const brain = new LLMBrain({ apiKey: 'test-key' });
        expect(brain.isConfigured()).to.be.true;
      });
    });

    describe('think', function() {
      it('没有配置时应该抛出 "模型没配上" 错误', async function() {
        const brain = new LLMBrain();
        
        try {
          await brain.think({ input: 'test', history: [], availableSkills: [] });
          expect.fail('应该抛出错误');
        } catch (error) {
          expect(error.message).to.equal('模型没配上');
        }
      });
    });
  });

  describe('createBrain', function() {
    it('应该能创建 fake brain', function() {
      const brain = createBrain('fake');
      expect(brain).to.be.instanceOf(FakeBrain);
    });

    it('应该能创建 llm brain', function() {
      const brain = createBrain('llm');
      expect(brain).to.be.instanceOf(LLMBrain);
    });

    it('对于未知类型应该抛出错误', function() {
      expect(() => createBrain('unknown')).to.throw('未知的模型类型');
    });
  });
});
