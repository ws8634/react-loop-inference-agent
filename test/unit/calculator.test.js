const { expect } = require('chai');
const { CalculatorSkill } = require('../../src');

describe('CalculatorSkill', function() {
  let skill;

  beforeEach(function() {
    skill = new CalculatorSkill();
  });

  describe('正向用例 - 基本运算', function() {
    it('应该正确计算加法', async function() {
      const result = await skill.execute({ expression: '1 + 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(3);
    });

    it('应该正确计算减法', async function() {
      const result = await skill.execute({ expression: '5 - 3' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(2);
    });

    it('应该正确计算乘法', async function() {
      const result = await skill.execute({ expression: '4 * 5' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(20);
    });

    it('应该正确计算除法', async function() {
      const result = await skill.execute({ expression: '10 / 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(5);
    });

    it('应该正确计算小数运算', async function() {
      const result = await skill.execute({ expression: '1.5 + 2.5' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(4);
    });
  });

  describe('正向用例 - 运算优先级', function() {
    it('应该正确处理乘法优先级高于加法', async function() {
      const result = await skill.execute({ expression: '1 + 2 * 3' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(7);
    });

    it('应该正确处理乘法优先级高于减法', async function() {
      const result = await skill.execute({ expression: '10 - 4 * 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(2);
    });

    it('应该正确处理除法优先级高于加法', async function() {
      const result = await skill.execute({ expression: '6 + 8 / 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(10);
    });

    it('应该正确处理连续运算', async function() {
      const result = await skill.execute({ expression: '2 + 3 * 4 - 6 / 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(11);
    });
  });

  describe('正向用例 - 括号', function() {
    it('应该正确处理单层括号', async function() {
      const result = await skill.execute({ expression: '(1 + 2) * 3' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(9);
    });

    it('应该正确处理括号改变优先级', async function() {
      const result = await skill.execute({ expression: '(10 - 4) / 2' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(3);
    });

    it('应该正确处理多个括号', async function() {
      const result = await skill.execute({ expression: '(2 + 3) * (4 - 1)' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(15);
    });

    it('应该正确处理括号内的优先级', async function() {
      const result = await skill.execute({ expression: '(1 + 2 * 3) * 4' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(28);
    });
  });

  describe('正向用例 - 空格处理', function() {
    it('应该忽略空格', async function() {
      const result = await skill.execute({ expression: '  10  +   20  ' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(30);
    });

    it('应该正确处理无空格表达式', async function() {
      const result = await skill.execute({ expression: '1+2*3' });
      
      expect(result.success).to.be.true;
      expect(result.result).to.equal(7);
    });
  });

  describe('反向用例 - 除零错误', function() {
    it('应该拒绝除零', async function() {
      const result = await skill.execute({ expression: '10 / 0' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('除零错误');
    });

    it('应该拒绝括号内的除零', async function() {
      const result = await skill.execute({ expression: '5 + (10 / 0)' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('除零错误');
    });
  });

  describe('反向用例 - 括号问题', function() {
    it('应该拒绝不匹配的括号 (多开)', async function() {
      const result = await skill.execute({ expression: '(1 + 2' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('括号不匹配');
    });

    it('应该拒绝不匹配的括号 (多闭)', async function() {
      const result = await skill.execute({ expression: '1 + 2)' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('括号不匹配');
    });

    it('应该拒绝空括号', async function() {
      const result = await skill.execute({ expression: '() + 1' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('空括号');
    });

    it('应该拒绝嵌套括号', async function() {
      const result = await skill.execute({ expression: '((1 + 2))' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('不支持嵌套括号');
    });

    it('应该拒绝嵌套括号 2', async function() {
      const result = await skill.execute({ expression: '1 + ((2 + 3) * 4)' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('不支持嵌套括号');
    });

    it('应该拒绝嵌套括号 3', async function() {
      const result = await skill.execute({ expression: '((1))' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('不支持嵌套括号');
    });
  });

  describe('反向用例 - 无效表达式', function() {
    it('应该拒绝空表达式', async function() {
      const result = await skill.execute({ expression: '' });
      
      expect(result.success).to.be.false;
    });

    it('应该拒绝 null 表达式', async function() {
      const result = await skill.execute({ expression: null });
      
      expect(result.success).to.be.false;
    });

    it('应该拒绝空白表达式', async function() {
      const result = await skill.execute({ expression: '   ' });
      
      expect(result.success).to.be.false;
    });

    it('应该拒绝无效字符', async function() {
      const result = await skill.execute({ expression: '1 + abc' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('无效的字符');
    });

    it('应该拒绝无效字符 2', async function() {
      const result = await skill.execute({ expression: '1 ^ 2' });
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('无效的字符');
    });
  });
});
