package tencent

type TencentMessage struct {
	Role    string `json:"Role"`
	Content string `json:"Content"`
}

type TencentChatRequest struct {
	// Model Name，Optional Values包括 hunyuan-lite、hunyuan-standard、hunyuan-standard-256K、hunyuan-pro。
	// 各Model介绍请阅读 [产品概述](https://cloud.tencent.com/document/product/1729/104753) 中的说明。
	//
	// Note：
	// 不同的Modelbilling不同，请根据 [购买指南](https://cloud.tencent.com/document/product/1729/97731) 按需调用。
	Model *string `json:"Model"`
	// Chat上下文信息。
	// 说明：
	// 1. 长度最多 for  40，按对话Time从旧到新在数组中排列。
	// 2. Message.Role Optional Values：system、user、assistant。
	// 其中，system Role可选，如存在则必须位于列表的最开始。user  and assistant 需交替出现（一问一答），以 user 提问开始和结束，且 Content 不能 for 空。Role 的顺序示例：[system（可选） user assistant user assistant user ...]。
	// 3. Messages 中 Content 总长度不能超过ModelEnter长度上限（可参考 [产品概述](https://cloud.tencent.com/document/product/1729/104753) 文档），超过则会截断最前面的内容，只保留尾部内容。
	Messages []*TencentMessage `json:"Messages"`
	// 流式调用开 off 。
	// 说明：
	// 1. 未传值时Default for 非流式调用（false）。
	// 2. 流式调用时以 SSE 协议增量Back result （Back值取 Choices[n].Delta 中的值，需要拼接增量 Date才能获得完整 result ）。
	// 3. 非流式调用时：
	// 调用方式与普通 HTTP 请求None异。
	// 接口响应耗时较长，**如需更低时延建议Settings for  true**。
	// 只Back一次最终 result （Back值取 Choices[n].Message 中的值）。
	//
	// Note：
	// 通过 SDK 调用时，流式和非流式调用需用**不同的方式**获取Back值，具体参考 SDK 中的注释或示例（在各语言 SDK 代码仓库的 examples/hunyuan/v20230901/ 目录中）。
	Stream *bool `json:"Stream,omitempty"`
	// 说明：
	// 1. 影响输出文本的多样性，取值越大，生成文本的多样性越强。
	// 2. 取值区间 for  [0.0, 1.0]，未传值时使用各Model推荐值。
	// 3. 非必要不建议使用，不合理的取值会影响效果。
	TopP *float64 `json:"TopP,omitempty"`
	// 说明：
	// 1. 较高的数值会使输出更加随机，而较低的数值会使其更加集中和confirm。
	// 2. 取值区间 for  [0.0, 2.0]，未传值时使用各Model推荐值。
	// 3. 非必要不建议使用，不合理的取值会影响效果。
	Temperature *float64 `json:"Temperature,omitempty"`
}

type TencentError struct {
	Code    int    `json:"Code"`
	Message string `json:"Message"`
}

type TencentUsage struct {
	PromptTokens     int `json:"PromptTokens"`
	CompletionTokens int `json:"CompletionTokens"`
	TotalTokens      int `json:"TotalTokens"`
}

type TencentResponseChoices struct {
	FinishReason string         `json:"FinishReason,omitempty"` // 流式结束标志位， for  stop 则表示尾包
	Messages     TencentMessage `json:"Message,omitempty"`      // 内容，同步模式Back内容，流模式 for  null 输出 content 内容总数最多 support  1024token。
	Delta        TencentMessage `json:"Delta,omitempty"`        // 内容，流模式Back内容，同步模式 for  null 输出 content 内容总数最多 support  1024token。
}

type TencentChatResponse struct {
	Choices []TencentResponseChoices `json:"Choices,omitempty"` //  result 
	Created int64                    `json:"Created,omitempty"` // unix Time戳的字符串
	Id      string                   `json:"Id,omitempty"`      // 会话 id
	Usage   TencentUsage             `json:"Usage,omitempty"`   // token Quantity
	Error   TencentError             `json:"Error,omitempty"`   // 错误信息 Note：此字段可能Back null，表示取不到有效值
	Note    string                   `json:"Note,omitempty"`    // 注释
	ReqID   string                   `json:"Req_id,omitempty"`  // 唯一请求 Id，每次请求都会Back。用于反馈接口入参
}

type TencentChatResponseSB struct {
	Response TencentChatResponse `json:"Response,omitempty"`
}
