const { expect } = require('chai');
const { MemoryFileSkill } = require('../../src');

describe('MemoryFileSkill', function() {
  let skill;

  beforeEach(function() {
    skill = new MemoryFileSkill();
  });

  describe('正向用例', function() {
    it('应该能够读取存在的 .txt 文件', async function() {
      const result = await skill.execute({ filename: 'welcome.txt' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.include('欢迎使用思考循环代理系统');
    });

    it('应该能够读取存在的 .json 文件', async function() {
      const result = await skill.execute({ filename: 'config.json' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.include('version');
    });

    it('应该能够读取子目录下的文件', async function() {
      const result = await skill.execute({ filename: 'math/constants.txt' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.include('π');
    });

    it('应该支持两种分隔符的路径', async function() {
      const result = await skill.execute({ filename: 'math\\constants.txt' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.include('π');
    });
  });

  describe('反向用例 - 路径安全', function() {
    it('应该拒绝包含 ".." 的路径', async function() {
      const result = await skill.execute({ filename: '../secret.txt' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝中间包含 ".." 的路径', async function() {
      const result = await skill.execute({ filename: 'math/../welcome.txt' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝以 "/" 开头的绝对路径', async function() {
      const result = await skill.execute({ filename: '/etc/passwd' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝以 "~" 开头的路径', async function() {
      const result = await skill.execute({ filename: '~/.ssh/id_rsa' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝以 "/" 结尾的路径', async function() {
      const result = await skill.execute({ filename: 'math/' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝包含 "//" 的路径', async function() {
      const result = await skill.execute({ filename: 'math//constants.txt' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝包含 "/./" 的路径', async function() {
      const result = await skill.execute({ filename: './welcome.txt' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });
  });

  describe('反向用例 - 文件类型和存在性', function() {
    it('应该拒绝不支持的扩展名', async function() {
      const result = await skill.execute({ filename: 'script.js' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝没有扩展名的路径', async function() {
      const result = await skill.execute({ filename: 'welcome' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该报告不存在的文件', async function() {
      const result = await skill.execute({ filename: 'nonexistent.txt' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('文件不存在');
    });

    it('应该拒绝空文件名', async function() {
      const result = await skill.execute({ filename: '' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });

    it('应该拒绝 null 文件名', async function() {
      const result = await skill.execute({ filename: null });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('非法的文件路径');
    });
  });
});
