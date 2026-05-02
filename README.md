# 思考循环代理

一个简单的思考循环代理框架，用户输入一段话，程序自动思考、调用工具、循环执行。

**注意**：本程序不支持 stdin 管道输入，只能通过命令行参数传入输入内容。

## 从零跑通

### 安装依赖
```bash
npm install
```

### 运行主程序
```bash
# 直接用 node 运行
node src/cli.js "你好"

# 读取内存文件
node src/cli.js "请读取 welcome.txt 文件"

# 计算表达式（支持单层括号，不支持嵌套）
node src/cli.js "计算 (1 + 2) * 3 等于多少"
```

### 运行测试
```bash
# quiet 模式全过
npm test
```

### 命令行选项
```
-m, --max-iterations <数字>  最大迭代次数 (默认: 10)
-b, --brain <类型>            模型类型 (默认: fake)
-q, --quiet                   安静模式，只输出结果
-t, --types                   列出所有可用的模型类型
-h, --help                    显示帮助信息
```

## 返回值说明

| 返回码 | 含义 | 说明 |
|--------|------|------|
| 0 | 成功 | 任务正常完成 |
| 1 | 迭代超限 | 达到最大迭代次数，任务未完成 |
| 2 | 错误 | 程序执行出错（参数错误、运行时错误等） |
| 3 | 模型未配置 | 使用 llm 模型但没有配置 API Key |

## 模型类型

| 类型 | 说明 |
|------|------|
| `fake` | 离线假模型（默认，无需配置） |
| `llm` | 真实大模型（需要配置 AGENT_LLM_API_KEY 环境变量） |
| `loop` | 测试专用，永远返回 think，用于测试迭代超限 |

## 接真实大模型

要接真实大模型，需要改 `src/brain/llm.js` 这个钩子。

### 环境变量配置
```bash
# 设置 API Key（必填）
export AGENT_LLM_API_KEY="你的-api-key"

# 可选：设置 API 地址（默认 OpenAI）
export AGENT_LLM_BASE_URL="https://api.openai.com/v1"

# 可选：设置模型名称
export AGENT_LLM_MODEL="gpt-3.5-turbo"
```

### 使用 LLM 模型
```bash
node src/cli.js -b llm "你的问题"
```

### 接口说明
`LLMBrain` 类有两个核心方法：

1. **`isConfigured()`** - 检查模型是否配置好
   - 返回 `true` 表示已配置，可以调用
   - 返回 `false` 会抛出 "模型没配上" 错误

2. **`think(state)`** - 核心思考方法
   - 输入: `{ input, history, availableSkills }`
   - 输出: 必须返回以下三种之一：
     ```js
     { type: 'think', content: '思考内容' }        // 继续思考
     { type: 'tool_call', tool: 'xxx', params: {} } // 调用工具
     { type: 'finish', content: '最终结果' }        // 任务完成
     ```

### 替换为其他模型
如果你想换成别的模型（比如 Claude、本地模型）：

1. 新建 `src/brain/claude.js`（或其他名字）
2. 实现和 `LLMBrain` 一样的接口：
   - `isConfigured()` - 返回布尔值
   - `think(state)` - 返回指定格式的对象
3. 在 `src/brain/index.js` 里注册新类型：
   ```js
   const BRAIN_TYPES = {
     fake: FakeBrain,
     llm: LLMBrain,
     claude: ClaudeBrain  // 加这行
   };
   ```
4. 使用时指定 `-b claude`

## 内置工具

### memory_file - 内存文件读取
从预定义的内存数据中读取文件。

**安全机制**：
- 拒绝包含 `..` 的路径（防止路径遍历）
- 拒绝绝对路径 `/` 和 `~`
- 拒绝 `./` 开头的相对路径
- 只允许 `.txt` 和 `.json` 扩展名

**可用文件**：
- `welcome.txt` - 欢迎信息
- `config.json` - 配置文件
- `notes.txt` - 测试文件
- `math/constants.txt` - 数学常数
- `math/prime.txt` - 质数列表

### calculator - 计算器
计算数学表达式，自己解析，不使用 `eval`。

**支持**：
- 加减乘除 `+ - * /`
- 运算优先级（先乘除后加减）
- **单层括号 `()`（不支持嵌套括号 `(())`**
- 小数

**错误处理**：
- 除零错误 → 返回失败
- 括号不匹配 → 返回失败
- 嵌套括号 → 返回失败
- 无效字符 → 返回失败

## 代码结构

```
src/
├── cli.js              # 命令行入口
├── index.js            # 模块导出入口
├── agent/
│   └── index.js        # 主循环轮转逻辑
├── brain/
│   ├── index.js        # 模型工厂
│   ├── fake.js         # 假模型（离线，默认）
│   ├── llm.js          # 真实模型接口（钩子）
│   └── loop.js         # 测试专用 loop 模型
├── skills/
│   ├── index.js        # 工具模块导出
│   ├── registry.js     # 工具注册中心
│   ├── memory_file.js  # 内存文件读取工具
│   └── calculator.js   # 计算器工具
└── data/
    └── memory_files.js # 内存文件数据

test/
├── unit/
│   ├── memory_file.test.js
│   ├── calculator.test.js
│   ├── fake_brain.test.js
│   └── registry.test.js
└── integration/
    └── cli.test.js     # 子进程集成测试
```

## 控制台输出示例

```
[第 1 轮思考]
----------------------------------------
[思考阶段] 正在分析输入和历史...
[工具调用] 准备调用工具: calculator
[参数] {"expression":"1 + 2 * 3"}
[执行阶段] 正在执行工具...
[工具结果] 执行成功: 7

[第 2 轮思考]
----------------------------------------
[思考阶段] 正在分析输入和历史...
[结束阶段] 任务完成
[最终结果] 任务完成。根据工具执行结果：7
```

## 测试专用功能（开发用）

### 直接调用工具（测试用）
FakeBrain 支持一种特殊输入格式，可直接调用指定工具：

```
:::工具名:::JSON格式的参数
```

示例：
```bash
# 触发脏路径被拒
node src/cli.js ':::memory_file:::{"filename":"../secret.txt"}'

# 触发除零被拒
node src/cli.js ':::calculator:::{"expression":"10 / 0"}'

# 触发嵌套括号被拒
node src/cli.js ':::calculator:::{"expression":"((1 + 2))"}'
```

### 测试迭代超限
使用 `loop` 模型永远返回 think：

```bash
node src/cli.js -b loop -m 2 "测试"
```

预期：退出码为 1，stdout 包含 "[警告] 达到最大迭代次数 2"
