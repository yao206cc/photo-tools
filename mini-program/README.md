# 微信小程序项目

## 开发环境设置

### 使用Docker容器（推荐）

我们提供了Docker配置，可以在不安装Node.js的情况下进行开发：

1. 确保已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. 使用VS Code的Dev Container扩展：
   - 安装 [VS Code](https://code.visualstudio.com/)
   - 安装 [Dev Containers扩展](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
   - 用VS Code打开项目文件夹
   - 点击右下角弹出的"在容器中重新打开"或按F1输入"Dev Containers: Open Folder in Container"

3. 容器启动后，在VS Code终端中执行：
   ```bash
   cd mini-program/miniprogram
   npm install
   ```

4. 在微信开发者工具中，点击"工具" -> "构建npm"完成TDesign组件安装

### 手动构建Docker镜像

如果Dev Container无法正常启动，可以手动构建和运行Docker容器：

```bash
# 在项目根目录执行
cd mini-program
docker build -t miniprogram-dev .
docker run -it -v $(pwd):/app miniprogram-dev bash

# 容器内执行
cd /app/miniprogram
npm install
```

### 常见问题排查

1. **找不到NPM包**
   - 确保已在容器内安装NPM包
   - 检查project.config.json中packNpmManually设置是否为true
   - 在微信开发者工具中执行"构建npm"

2. **Docker镜像拉取失败**
   - 我们使用了Node官方镜像，如遇网络问题，可尝试使用其他镜像源
   - 修改Dockerfile中的FROM行，改为国内可访问的镜像源

3. **构建过程中出现"/miniprogram/package.json: not found"错误**
   - 检查项目结构，确保mini-program/miniprogram/package.json文件存在
   - 如果文件确实存在但仍报错，可能是Docker构建上下文问题，尝试在mini-program目录下运行Docker命令

## 项目结构
```
项目根目录/
├── .devcontainer/       # VS Code开发容器配置
├── mini-program/        # 微信小程序项目
│   ├── Dockerfile       # Docker镜像定义
│   ├── docker-compose.yml # Docker Compose配置
│   ├── miniprogram/     # 小程序源代码
│   │   ├── package.json # 依赖声明
```

## 解决NPM包问题

在容器中安装npm包后，需要在微信开发者工具中执行"构建npm"操作：

1. 点击菜单栏的 "工具" -> "构建npm"
2. 等待构建完成
3. 重新编译小程序

这样TDesign组件就能正常加载了。 
