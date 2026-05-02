const memoryFiles = require('../data/memory_files');

const ALLOWED_EXTENSIONS = ['.txt', '.json'];

class MemoryFileSkill {
  constructor() {
    this.name = 'memory_file';
    this.description = '从内存中读取文件内容';
    this.params = {
      filename: {
        type: 'string',
        description: '要读取的文件名'
      }
    };
  }

  _isValidPath(filename) {
    if (!filename || typeof filename !== 'string') {
      return false;
    }

    const normalized = filename.replace(/\\/g, '/');

    if (normalized.includes('..')) {
      return false;
    }

    if (normalized.startsWith('/') || normalized.startsWith('~') || normalized.startsWith('./')) {
      return false;
    }

    if (normalized.includes('//') || normalized.includes('/./') || normalized.endsWith('/')) {
      return false;
    }

    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => normalized.endsWith(ext));
    if (!hasValidExt) {
      return false;
    }

    return true;
  }

  async execute(params) {
    const { filename } = params;

    if (!this._isValidPath(filename)) {
      return {
        success: false,
        error: '非法的文件路径。文件名不能包含".."，不能以"/"或"~"开头，且必须是.txt或.json文件。'
      };
    }

    const normalized = filename.replace(/\\/g, '/');
    const content = memoryFiles[normalized];

    if (content === undefined) {
      return {
        success: false,
        error: `文件不存在: ${filename}`
      };
    }

    return {
      success: true,
      result: content
    };
  }
}

module.exports = MemoryFileSkill;
