# Suno API文档

**简介**:Suno API文档

## 接口列表
 support 的接口如下：
+ [x] /suno/submit/music
+ [x] /suno/submit/lyrics
+ [x] /suno/fetch
+ [x] /suno/fetch/:id

## Model列表

### Suno API support 

- suno_music (Custom模式、灵感模式、续写)
- suno_lyrics (生成歌词)


## Model price Settings（在Settings-Operation Settings-Fixed Price for ModelSettings中Settings）
```json
{
  "suno_music": 0.3,
  "suno_lyrics": 0.01
}
```

## ChannelSettings

### 对接 Suno API

1.
部署 Suno API，并 Configuration 好suno账号等（强烈建议SettingsKey），[项目地址](https://github.com/Suno-API/Suno-API)

2. 在ChannelManagement中Add channel，ChannelType Select **Suno API**
   ，Model请参考上方Model列表
3. **Proxy**填写 Suno API 部署的地址，For example：http://localhost:8080
4. Key填写 Suno API 的Key，如果没有SettingsKey，可以随便填

### 对接上游new api

1. 在ChannelManagement中Add channel，ChannelType Select **Suno API**，或任意Type，只需Model包含上方Model列表的Model
2. **Proxy**填写上游new api的地址，For example：http://localhost:3000
3. Key填写上游new api的Key