# Midjourney Proxy API文档

**简介**:Midjourney Proxy API文档

## 接口列表
 support 的接口如下：
+ [x] /mj/submit/imagine
+ [x] /mj/submit/change
+ [x] /mj/submit/blend
+ [x] /mj/submit/describe
+ [x] /mj/image/{id} （通过此接口获取图片，**请必须在System Settings中填写Server Address！！**）
+ [x] /mj/task/{id}/fetch （此接口Back的Image URL for 经过One API转发的地址）
+ [x] /task/list-by-condition
+ [x] /mj/submit/action （仅midjourney-proxy-plus support ，下同）
+ [x] /mj/submit/modal
+ [x] /mj/submit/shorten
+ [x] /mj/task/{id}/image-seed
+ [x] /mj/insight-face/swap （InsightFace）

## Model列表

### midjourney-proxy support 

- mj_imagine (Drawing)
- mj_variation (Variation)
- mj_reroll (Reroll)
- mj_blend (混合)
- mj_upscale (Upscale)
- mj_describe (Image to Text)

### 仅midjourney-proxy-plus support 

- mj_zoom (比例Zoom)
- mj_shorten (Prompt词缩短)
- mj_modal (窗口Submit，局部Reroll和Custom比例Zoom必须和mj_modal一同添加)
- mj_inpaint (局部RerollSubmit，必须和mj_modal一同添加)
- mj_custom_zoom (Custom比例Zoom，必须和mj_modal一同添加)
- mj_high_variation (High Variation)
- mj_low_variation (Low Variation)
- mj_pan (Pan)
- swap_face (Swap Face)

## Model price Settings（在Settings-Operation Settings-Fixed Price for ModelSettings中Settings）
```json
{
  "mj_imagine": 0.1,
  "mj_variation": 0.1,
  "mj_reroll": 0.1,
  "mj_blend": 0.1,
  "mj_modal": 0.1,
  "mj_zoom": 0.1,
  "mj_shorten": 0.1,
  "mj_high_variation": 0.1,
  "mj_low_variation": 0.1,
  "mj_pan": 0.1,
  "mj_inpaint": 0,
  "mj_custom_zoom": 0,
  "mj_describe": 0.05,
  "mj_upscale": 0.05,
  "swap_face": 0.05
}
```
其中mj_inpaint和mj_custom_zoom的 price Settings for 0，是因 for 这两  Model需要搭配mj_modal使用，所以 price Developed bymj_modal决定。

## ChannelSettings

### 对接 midjourney-proxy(plus)

1.

部署Midjourney-Proxy，并 Configuration 好midjourney账号等（强烈建议SettingsKey），[项目地址](https://github.com/novicezk/midjourney-proxy)

2. 在ChannelManagement中Add channel，ChannelType Select **Midjourney Proxy**，如果是plusVersion Select **Midjourney Proxy Plus**
   ，Model请参考上方Model列表
3. **Proxy**填写midjourney-proxy部署的地址，For example：http://localhost:8080
4. Key填写midjourney-proxy的Key，如果没有SettingsKey，可以随便填

### 对接上游new api

1. 在ChannelManagement中Add channel，ChannelType Select **Midjourney Proxy Plus**，Model请参考上方Model列表
2. **Proxy**填写上游new api的地址，For example：http://localhost:3000
3. Key填写上游new api的Key