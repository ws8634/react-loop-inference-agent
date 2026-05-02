const MemoryFileSkill = require('./memory_file');
const CalculatorSkill = require('./calculator');

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this._registerDefaultSkills();
  }

  _registerDefaultSkills() {
    this.register(new MemoryFileSkill());
    this.register(new CalculatorSkill());
  }

  register(skill) {
    if (!skill.name || !skill.execute) {
      throw new Error('无效的 skill: 必须包含 name 和 execute 方法');
    }
    this.skills.set(skill.name, skill);
  }

  get(name) {
    return this.skills.get(name);
  }

  has(name) {
    return this.skills.has(name);
  }

  list() {
    return Array.from(this.skills.values()).map(skill => ({
      name: skill.name,
      description: skill.description,
      params: skill.params
    }));
  }

  async execute(skillName, params) {
    const skill = this.get(skillName);
    
    if (!skill) {
      return {
        success: false,
        error: `未知的工具: ${skillName}`
      };
    }

    return skill.execute(params);
  }
}

const defaultRegistry = new SkillRegistry();

module.exports = {
  SkillRegistry,
  defaultRegistry,
  MemoryFileSkill,
  CalculatorSkill
};
