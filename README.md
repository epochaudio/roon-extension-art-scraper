# 艺术刮刀 (Art Scraper)

艺术刮刀是一个 Roon 扩展程序，用于从您的 Roon 音乐库中批量下载专辑和艺术家的封面图片。

## 功能特点

- 支持批量下载专辑封面
- 支持批量下载艺术家图片
- 可选择不同的图片尺寸（小、中、大）
- 可设置最大下载图片数量
- 支持断点续传和错误重试
- Docker 容器化部署

## 图片尺寸选项

- 小图：225 x 225 像素
- 中图：500 x 500 像素（默认）
- 大图：1000 x 1000 像素

## 使用方法

### Docker 方式运行（推荐）

1. 确保已安装 Docker 和 Docker Compose
2. 克隆本仓库
3. 在项目目录下运行：
```
bash
docker-compose up
```




## 配置说明

1. 启动程序后，在 Roon 设置中启用"艺术刮刀"扩展
2. 在扩展设置中可以配置：
   - 下载类型（专辑/艺术家）
   - 图片尺寸
   - 最大图片数量（1-10000）

## 下载位置

- 专辑封面将保存在 `art/Albums/` 目录
- 艺术家图片将保存在 `art/Artists/` 目录

## 注意事项

- 图片文件名会自动过滤特殊字符
- 下载失败时会自动重试最多3次
- 建议使用 Docker 方式运行以获得最佳体验

## 版本历史

- v1.0.1
  - 添加最大图片数量限制
  - 优化中文界面
  - 改进错误处理机制

- v0.1.1
  - 初始版本发布

## 许可证

本项目采用 Apache License 2.0 许可证

## 技术支持

如有问题，请联系：
- 邮箱：sales@epochaudio.cn
- 网站：https://www.epochaudio.cn

## 致谢

感谢 [Roon Labs](https://roonlabs.com/) 提供的优秀 API 支持。
感谢  https://github.com/TheAppgineer/roon-extension-art-scraper 提供的灵感。
