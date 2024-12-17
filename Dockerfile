# 使用Node.js官方镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装git
RUN apk add --no-cache git

# 复制package.json和package-lock.json
COPY package.json package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 创建art目录
RUN mkdir -p /app/art/Albums /app/art/Artists

# 设置数据卷
VOLUME [ "/app/art", "/app/.reg" ]

# 运行应用
CMD [ "node", "art-scraper.js" ]
