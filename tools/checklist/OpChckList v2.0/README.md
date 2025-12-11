# OpChckList v2.0 - 协作版 (Collaborative Version)

<div align="center">
这是一个基于 OpChckList v1.0 的多人协作清单工具，支持局域网内多用户实时协作。<br>
This is a collaborative checklist tool based on OpChckList v1.0, supporting real-time collaboration among multiple users on a local network.
</div>

## 功能特点 (Features)

- 支持多用户实时协作编辑清单 (Real-time collaboration with multiple users)
- 显示其他用户的编辑状态 (Show editing status of other users)
- 防止编辑冲突 (Prevent editing conflicts)
- 支持所有 v1.0 的功能，包括图片上传、夜间模式等 (Support all v1.0 features, including image upload, night mode, etc.)

## 如何使用 (How to Use)

### 服务器设置 (Server Setup)

1. 确保安装了 Node.js (Make sure Node.js is installed)
2. 在命令行中运行以下命令安装依赖 (Run the following command to install dependencies):
   ```
   npm install ws
   ```
3. 启动服务器 (Start the server):
   ```
   node server.js
   ```
4. 服务器将在端口 8080 上运行 (The server will run on port 8080)

### 客户端连接 (Client Connection)

1. 打开 `OpChckList.html` 文件 (Open the `OpChckList.html` file)
2. 在顶部输入你的用户名 (Enter your username at the top)
3. 服务器地址默认为 `ws://localhost:8080`，如果服务器在其他计算机上，请将 `localhost` 替换为服务器的 IP 地址 (The server address is `ws://localhost:8080` by default. If the server is on another computer, replace `localhost` with the server's IP address)
4. 点击连接按钮 (Click the connect button)
5. 连接成功后，你将看到其他在线用户和当前清单状态 (After connecting successfully, you will see other online users and the current checklist state)

## 注意事项 (Notes)

- 服务器会自动保存清单状态，即使所有用户断开连接也不会丢失数据 (The server automatically saves the checklist state, so data won't be lost even if all users disconnect)
- 当有人正在编辑某个项目时，其他用户将无法编辑该项目 (When someone is editing an item, other users cannot edit that item)
- 图片不会在用户之间同步，需要单独保存和共享 (Images are not synchronized between users and need to be saved and shared separately)
