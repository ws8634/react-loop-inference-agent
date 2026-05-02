class FakeBrain {
  constructor() {
    this.name = 'fake';
  }

  isConfigured() {
    return true;
  }

  async think(state) {
    const { input, history, availableSkills } = state;
    const lastAction = history.length > 0 ? history[history.length - 1] : null;

    if (lastAction && lastAction.type === 'tool_result') {
      if (lastAction.success) {
        return {
          type: 'finish',
          content: `任务完成。根据工具执行结果：${lastAction.result}`
        };
      } else {
        return {
          type: 'finish',
          content: `任务失败。工具执行错误：${lastAction.error}`
        };
      }
    }

    const directCall = this._parseDirectCall(input);
    if (directCall) {
      return {
        type: 'tool_call',
        tool: directCall.tool,
        params: directCall.params
      };
    }

    if (this._shouldReadFile(input)) {
      const fileName = this._extractFileName(input);
      if (fileName) {
        return {
          type: 'tool_call',
          tool: 'memory_file',
          params: { filename: fileName }
        };
      }
    }

    if (this._shouldCalculate(input)) {
      const expression = this._extractExpression(input);
      if (expression) {
        return {
          type: 'tool_call',
          tool: 'calculator',
          params: { expression: expression }
        };
      }
    }

    if (history.length === 0) {
      if (input.includes('文件') || input.includes('read') || input.includes('读取')) {
        return {
          type: 'think',
          content: `用户想要读取文件。我应该调用 memory_file 工具。建议先让用户指定具体的文件名，或者我可以尝试读取 welcome.txt。`
        };
      }
      if (input.includes('计算') || input.includes('算') || input.includes('calculate')) {
        return {
          type: 'think',
          content: `用户想要计算。我应该调用 calculator 工具。用户需要提供具体的表达式。`
        };
      }
    }

    return {
      type: 'finish',
      content: `我理解你的问题："${input}"。这是一个简单的假模型回复。可用的工具包括：memory_file（读取内存文件）和 calculator（计算数学表达式）。`
    };
  }

  _shouldReadFile(input) {
    const patterns = [
      /读取.*文件/i,
      /read.*file/i,
      /打开.*文件/i,
      /查看.*文件/i
    ];
    return patterns.some(p => p.test(input));
  }

  _shouldCalculate(input) {
    const patterns = [
      /计算/i,
      /等于多少/i,
      /结果是多少/i,
      /solve|calculate|compute/i,
      /\d+\s*[+\-*/]\s*\d+/
    ];
    return patterns.some(p => p.test(input));
  }

  _extractFileName(input) {
    const patterns = [
      /['"]([^'"]+\.txt|json)['"]/,
      /([a-zA-Z0-9_/-]+\.(?:txt|json))/,
      /(welcome\.txt|config\.json|notes\.txt)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  _extractExpression(input) {
    const patterns = [
      /([\d+\-*/\s()]+)\s*等于多少/,
      /计算\s*([\d+\-*/\s()]+)/,
      /([\d]+\s*[+\-*/]\s*[\d\s()]+)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  _parseDirectCall(input) {
    const pattern = /^:::([a-zA-Z0-9_]+):::(.+)$/;
    const match = input.match(pattern);
    
    if (!match) {
      return null;
    }

    const tool = match[1];
    try {
      const params = JSON.parse(match[2]);
      return { tool, params };
    } catch {
      return null;
    }
  }
}

module.exports = FakeBrain;
