const { expect } = require('chai');
const { SkillRegistry, MemoryFileSkill, CalculatorSkill } = require('../../src');

describe('SkillRegistry', function() {
  let registry;

  beforeEach(function() {
    registry = new SkillRegistry();
  });

  describe('默认注册', function() {
    it('应该默认注册 memory_file', function() {
      expect(registry.has('memory_file')).to.be.true;
    });

    it('应该默认注册 calculator', function() {
      expect(registry.has('calculator')).to.be.true;
    });

    it('list 应该返回所有已注册的工具', function() {
      const skills = registry.list();
      
      expect(skills).to.be.an('array');
      expect(skills.length).to.be.greaterThan(0);
      
      const memoryFile = skills.find(s => s.name === 'memory_file');
      expect(memoryFile).to.exist;
      expect(memoryFile.description).to.exist;
      expect(memoryFile.params).to.exist;
    });
  });

  describe('注册和查询', function() {
    class TestSkill {
      constructor() {
        this.name = 'test_skill';
        this.description = '测试技能';
        this.params = { test: { type: 'string' } };
      }
      async execute(params) {
        return { success: true, result: params };
      }
    }

    it('应该能够注册新技能', function() {
      const skill = new TestSkill();
      registry.register(skill);
      
      expect(registry.has('test_skill')).to.be.true;
    });

    it('应该能够获取已注册的技能', function() {
      const skill = new TestSkill();
      registry.register(skill);
      
      const retrieved = registry.get('test_skill');
      expect(retrieved).to.equal(skill);
    });

    it('获取不存在的技能应该返回 undefined', function() {
      const retrieved = registry.get('nonexistent');
      expect(retrieved).to.be.undefined;
    });

    it('注册无效技能应该抛出错误', function() {
      expect(() => registry.register({})).to.throw('无效的 skill');
    });

    it('注册缺少 execute 的技能应该抛出错误', function() {
      expect(() => registry.register({ name: 'bad' })).to.throw('无效的 skill');
    });
  });

  describe('执行', function() {
    it('应该能够执行已注册的技能', async function() {
      const result = await registry.execute('memory_file', { filename: 'welcome.txt' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.exist;
    });

    it('执行不存在的技能应该返回失败', async function() {
      const result = await registry.execute('nonexistent', {});
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('未知的工具');
    });

    it('应该正确执行 calculator', async function() {
      const result = await registry.execute('calculator', { expression: '2 + 3' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(5);
    });
  });
});
