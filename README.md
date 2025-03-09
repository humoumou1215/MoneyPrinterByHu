# MoneyPrinterByHu - 阿里百炼大模型思考记录器

这是一个用于记录用户输入和阿里百炼大模型响应的Python应用程序。它使用Sqlite数据库存储数据，提供后台进程监听用户输入的变化，并通过前端Web界面展示模型的思考过程和结果。

## 功能特点

- 使用Sqlite数据库存储用户输入和模型响应
- 后台进程自动监听用户输入的新增和修改
- 调用阿里百炼API获取模型思考过程和结果
- Web前端界面展示所有记录
- 实时显示模型思考状态和过程

## 系统要求

- Python 3.7+
- 阿里百炼API密钥（可选，开发测试时可使用模拟API）

## 安装步骤

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/MoneyPrinterByHu.git
cd MoneyPrinterByHu
```

2. 安装依赖：

```bash
pip install -r requirements.txt
```

3. 配置环境变量（可选）：

创建`.env`文件并添加以下内容：

```
AILIAN_API_KEY=your_api_key_here
AILIAN_API_URL=https://api.example.com/ailian
USE_MOCK_API=True  # 设置为False以使用真实API
```

## 使用方法

1. 启动应用：

```bash
python app/app.py
```

2. 打开浏览器访问：http://localhost:5000

3. 在Web界面中输入内容并提交

4. 后台将自动处理输入并显示模型思考过程和结果

## 项目结构

```
MoneyPrinterByHu/
├── app/
│   ├── app.py               # 主应用入口
│   ├── database/
│   │   ├── models.py        # 数据库模型和操作
│   ├── api/
│   │   ├── ailian_api.py    # 阿里百炼API接口
│   ├── backend/
│   │   ├── processor.py     # 后台处理程序
│   └── frontend/
│       ├── app.py           # Flask前端应用
│       ├── templates/       # HTML模板
│       └── static/          # 静态资源文件
├── requirements.txt         # 依赖包列表
└── README.md               # 项目说明文档
```

## 开发和测试

默认情况下，应用使用模拟的阿里百炼API响应进行开发和测试。
要使用真实API，请在`.env`文件中设置`USE_MOCK_API=False`并提供有效的API密钥。

## 许可证

[MIT](LICENSE)