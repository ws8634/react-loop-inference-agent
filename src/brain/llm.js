class LLMBrain {
  constructor(config = {}) {
    this.name = 'llm';
    this.apiKey = config.apiKey || process.env.AGENT_LLM_API_KEY;
    this.baseUrl = config.baseUrl || process.env.AGENT_LLM_BASE_URL || 'https://api.openai.com/v1';
    this.model = config.model || process.env.AGENT_LLM_MODEL || 'gpt-3.5-turbo';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async think(state) {
    if (!this.isConfigured()) {
      throw new Error('模型没配上');
    }

    const messages = this._buildMessages(state);
    
    try {
      const response = await this._callLLMApi(messages);
      return this._parseResponse(response);
    } catch (error) {
      throw new Error(`LLM调用失败: ${error.message}`);
    }
  }

  _buildMessages(state) {
    const { input, history, availableSkills } = state;
    
    const messages = [
      {
        role: 'system',
        content: this._buildSystemPrompt(availableSkills)
      }
    ];

    messages.push({
      role: 'user',
      content: input
    });

    for (const action of history) {
      if (action.type === 'tool_call') {
        messages.push({
          role: 'assistant',
          content: `我需要调用工具: ${action.tool}，参数: ${JSON.stringify(action.params)}`
        });
      } else if (action.type === 'tool_result') {
        messages.push({
          role: 'user',
          content: `工具执行结果: ${action.result}`
        });
      }
    }

    return messages;
  }

  _buildSystemPrompt(availableSkills) {
    const skillDescriptions = availableSkills.map(skill => {
      return `- ${skill.name}: ${skill.description}\n  参数: ${JSON.stringify(skill.params)}`;
    }).join('\n');

    return `你是一个思考循环代理。你可以调用以下工具：

${skillDescriptions}

请按照以下格式响应：
1. 如果需要调用工具，请输出: 
   TOOL_CALL|工具名|JSON格式的参数
2. 如果任务完成，请输出:
   FINISH|最终结果

注意：每次只能调用一个工具。`;
  }

  async _callLLMApi(messages) {
    const url = `${this.baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API请求失败: ${response.status}`);
    }

    return response.json();
  }

  _parseResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    const toolMatch = content.match(/TOOL_CALL\|([^|]+)\|(.+)/);
    if (toolMatch) {
      const tool = toolMatch[1];
      try {
        const params = JSON.parse(toolMatch[2]);
        return {
          type: 'tool_call',
          tool,
          params
        };
      } catch {
        throw new Error('无法解析工具参数');
      }
    }

    const finishMatch = content.match(/FINISH\|(.+)/);
    if (finishMatch) {
      return {
        type: 'finish',
        content: finishMatch[1]
      };
    }

    return {
      type: 'finish',
      content: content
    };
  }
}

module.exports = LLMBrain;
