<div align="center">

![new-api](/web/public/logo.png)

# New API

<a href="https://trendshift.io/repositories/8227" target="_blank"><img src="https://trendshift.io/api/badge/repositories/8227" alt="Calcium-Ion%2Fnew-api | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

</div>

> [!NOTE]
> 本项目 for 开源项目，在[One API](#)的基础上进行二次 development 

> [!IMPORTANT]
> 使用者必须在遵循 OpenAI 的[使用 item 款](https://openai.com/policies/terms-of-use)以及**法律法规**的情况下使用，不得用于非法用途。
> 本项目仅供  人学习使用，不保证稳定性，且不提供任何技术 support 。
> 根据[《生成式人工智能服务Management暂行办法》](http://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm)的要求，请勿对中国地区公众提供一切未经备案的生成式人工智能服务。

> [!TIP]
> 最新版DockerMirror：`calciumion/new-api:latest`  
> Default账号root Password123456  
> 更新指令：
> ```
> docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower -cR
> ```


## 主要变更
此分叉Version的主要变更如下：

1. 全新的UI界面（部分界面还待更新）
2. 添加[Midjourney-Proxy(Plus)](https://github.com/novicezk/midjourney-proxy)接口的 support ，[对接文档](Midjourney.md)
3.  support Online Top-Up功能，可在System Settings中Settings，当前 support 的支付接口：
    + [x] 易支付
4.  support 用keyQuery使用Quota:
    + 配合项目[neko-api-key-tool](#/neko-api-key-tool)可实现用keyQuery使用
5. Channel显示UsedQuota， support 指定组织访问
6. 分页 support  Select 每页显示Quantity
7. 兼容原版One API的 Date库，可直接使用原版 Date库（one-api.db）
8.  support Model按次数收费，可在 System Settings-Operation Settings 中Settings
9.  support Channel**加权随机**
10. Data Dashboard
11. 可SettingsToken能调用的Model
12.  support Telegram授权Login。
    1. System Settings-Configure Login/Registration-允许通过TelegramLogin
    2. 对[@Botfather](https://t.me/botfather)Enter指令/setdomain
    3.  Select 你的bot，然后Enterhttp(s)://你的网站地址/login
    4. Telegram Bot Name是bot username 去掉@后的字符串
13. 添加 [Suno API](https://github.com/Suno-API/Suno-API)接口的 support ，[对接文档](Suno.md)
14.  support RerankModel，目前仅兼容Cohere和Jina，可接入Dify，[对接文档](Rerank.md)

## Model support 
此Version额外 support 以下Model：
1.  No. 三方Model **gps** （gpt-4-gizmo-*）
2. 智谱glm-4v，glm-4v识图
3. Anthropic Claude 3
4. [Ollama](https://github.com/ollama/ollama?tab=readme-ov-file)，Add channel时，Key可以随便填写，Default的请求地址是[http://localhost:11434](http://localhost:11434)，如果需要修改请在Channel中修改
5. [Midjourney-Proxy(Plus)](https://github.com/novicezk/midjourney-proxy)接口，[对接文档](Midjourney.md)
6. [零一万物](https://platform.lingyiwanwu.com/)
7. Custom Channel， support 填入完整调用地址
8. [Suno API](https://github.com/Suno-API/Suno-API) 接口，[对接文档](Suno.md)
9. RerankModel，目前 support [Cohere](https://cohere.ai/)和[Jina](https://jina.ai/)，[对接文档](Rerank.md)
10. Dify
11. Vertex AI，目前兼容Claude，Gemini，Llama3.1

您可以在Channel中Add Custom Modelgpt-4-gizmo-*，此Model并非OpenAI官方Model，而是 No. 三方Model，使用官方keyNone法调用。

## 比原版One API多出的 Configuration 
- `GENERATE_DEFAULT_TOKEN`：是否 for 新RegisterUser生成初始Token，Default for  `false`。
- `STREAMING_TIMEOUT`：Settings流式一次回复的超时Time，Default for  30 s。
- `DIFY_DEBUG`：Settings Dify Channel是否输出工作流和节点信息到客户端，Default for  `true`。
- `FORCE_STREAM_OPTION`：是否覆盖客户端stream_options参数，请求上游Back流模式usage，Default for  `true`，建议开启，不影响客户端传入stream_options参数Back result 。
- `GET_MEDIA_TOKEN`：是统计图片token，Default for  `true`，Close后将不再在本地计算图片token，可能会导致和上游billing不同，此项覆盖 `GET_MEDIA_TOKEN_NOT_STREAM` 选项作用。
- `GET_MEDIA_TOKEN_NOT_STREAM`：是否在非流（`stream=false`）情况下统计图片token，Default for  `true`。
- `UPDATE_TASK`：是否更新 Asynchronous tasks （Midjourney、Suno），Default for  `true`，Close后将不会更新 Task  schedule 。
- `GEMINI_MODEL_MAP`：GeminiModel指定Version(v1/v1beta)，使用“Model:Version”指定，","分隔，For example：-e GEMINI_MODEL_MAP="gemini-1.5-pro-latest:v1beta,gemini-1.5-pro-001:v1beta"， for 空则使用Default Configuration 
- `COHERE_SAFETY_SETTING`：CohereModel[安全Settings](https://docs.cohere.com/docs/safety-modes#overview)，Optional Values for  `NONE`, `CONTEXTUAL`，`STRICT`，Default for  `NONE`。
## 部署
### 部署要求
- 本地 Date库（Default）：SQLite（Docker 部署Default使用 SQLite，必须挂载 `/data` 目录到宿主机）
- 远程 Date库：MySQL Version >= 5.7.8，PgSQL Version >= 9.6
### Based on Docker 进行部署
```shell
# 使用 SQLite 的部署命令：
docker run --name new-api -d --restart always -p 3000:3000 -e TZ=Asia/Shanghai -v /home/ubuntu/data/new-api:/data calciumion/new-api:latest
# 使用 MySQL 的部署命令，在上面的基础上添加 `-e SQL_DSN="root:123456@tcp(localhost:3306)/oneapi"`，请自行修改 Date库连接参数。
# For example：
docker run --name new-api -d --restart always -p 3000:3000 -e SQL_DSN="root:123456@tcp(localhost:3306)/oneapi" -e TZ=Asia/Shanghai -v /home/ubuntu/data/new-api:/data calciumion/new-api:latest
```
### 使用宝塔面板Docker功能部署
```shell
# 使用 SQLite 的部署命令：
docker run --name new-api -d --restart always -p 3000:3000 -e TZ=Asia/Shanghai -v /www/wwwroot/new-api:/data calciumion/new-api:latest
# 使用 MySQL 的部署命令，在上面的基础上添加 `-e SQL_DSN="root:123456@tcp(localhost:3306)/oneapi"`，请自行修改 Date库连接参数。
# For example：
# Note： Date库要开启远程访问，并且只允许服务器IP访问
docker run --name new-api -d --restart always -p 3000:3000 -e SQL_DSN="root:123456@tcp(宝塔的Server Address:宝塔 Date库端口)/宝塔 Date库Name" -e TZ=Asia/Shanghai -v /www/wwwroot/new-api:/data calciumion/new-api:latest
# Note： Date库要开启远程访问，并且只允许服务器IP访问
```

## ChannelRetry
ChannelRetry功能已经实现，可以在`Settings->Operation Settings->General Settings`SettingsRetry次数，**建议开启缓存**功能。  
如果开启了Retry功能， No. 一次Retry使用同 priority ， No. 二次Retry使用下一   priority ，以此类推。
### 缓存Settings方法
1. `REDIS_CONN_STRING`：Settings之后将使用 Redis 作 for 缓存使用。
    + 例子：`REDIS_CONN_STRING=redis://default:redispw@localhost:49153`
2. `MEMORY_CACHE_ENABLED`：Enable内存缓存（如果Settings了`REDIS_CONN_STRING`，则None需手动Settings），会导致UserQuota的更新存在一定的延迟，Optional Values for  `true`  and `false`，未Settings则Default for  `false`。
    + 例子：`MEMORY_CACHE_ENABLED=true`
###  for 什么有的时候没有Retry
这些错误码不会Retry：400，504，524
### 我想让400也Retry
在`Channel->Edit`中，将`Status码复写`改 for 
```json
{
  "400": "500"
}
```
可以实现400错误转 for 500错误，从而Retry

## Midjourney接口Settings文档
[对接文档](Midjourney.md)

## Suno接口Settings文档
[对接文档](Suno.md)

## 界面截图
![796df8d287b7b7bd7853b2497e7df511](https://github.com/user-attachments/assets/255b5e97-2d3a-4434-b4fa-e922ad88ff5a)

![image](#/assets/61247483/ad0e7aae-0203-471c-9716-2d83768927d4)

![image](#/assets/61247483/3ca0b282-00ff-4c96-bf9d-e29ef615c605)
夜间模式  
![image](#/assets/61247483/1c66b593-bb9e-4757-9720-ff2759539242)
![image](#/assets/61247483/af9a07ee-5101-4b3d-8bd9-ae21a4fd7e9e)

## 交流群
<img src="#/assets/61247483/de536a8a-0161-47a7-a0a2-66ef6de81266" width="200">

## 相 off 项目
- [One API](#)：原版项目
- [Midjourney-Proxy](https://github.com/novicezk/midjourney-proxy)：Midjourney接口 support 
- [chatnio](https://github.com/Deeptrain-Community/chatnio)：下一代 AI 一站式 B/C 端解决方案
- [neko-api-key-tool](#/neko-api-key-tool)：用keyQuery使用Quota

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Calcium-Ion/new-api&type=Date)](https://star-history.com/#Calcium-Ion/new-api&Date)
