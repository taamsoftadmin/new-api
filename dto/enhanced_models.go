package dto

// EnhancedModelResponse is the enhanced response structure for the models endpoint
type EnhancedModelResponse struct {
	Models []EnhancedModel `json:"models"`
}

// EnhancedModel contains detailed information about a model
type EnhancedModel struct {
	Id           string                  `json:"id"`
	Object       string                  `json:"object"`
	Created      int64                   `json:"created"`
	OwnedBy      string                  `json:"owned_by"`
	Permission   []OpenAIModelPermission `json:"permission"`
	Root         string                  `json:"root"`
	Parent       interface{}             `json:"parent"`
	Stats        ModelStats              `json:"stats"`
	Pricing      ModelPricing            `json:"pricing"`
	Capabilities ModelCapabilities       `json:"capabilities"`
	Category     string                  `json:"category"`
	Group        string                  `json:"group"`
	ChannelType  ModelChannelType        `json:"channel_type"`
}

// ModelStats provides usage statistics for a model
type ModelStats struct {
	TotalRequests         int     `json:"total_requests"`
	TotalTokens           int     `json:"total_tokens"`
	AverageLatency        float64 `json:"average_latency"`
	SuccessRate           float64 `json:"success_rate"`
	LastUsed              int64   `json:"last_used"`
	AverageCostPerRequest float64 `json:"average_cost_per_request"`
}

// ModelPricing provides pricing details for a model
type ModelPricing struct {
	InputTokenPrice    float64 `json:"input_token_price"`
	OutputTokenPrice   float64 `json:"output_token_price"`
	TokenUnit          int     `json:"token_unit"` // Usually 1M tokens
	MinimumCharge      float64 `json:"minimum_charge"`
	Currency           string  `json:"currency"`             // USD, etc.
	PriceType          string  `json:"price_type"`           // "ratio" or "fixed"
	DisplayPrice       string  `json:"display_price"`        // Human-readable price format
	QuotaType          int     `json:"quota_type"`           // 0 = token-based, 1 = fixed price
	ModelRatio         float64 `json:"model_ratio"`          // Base ratio for model pricing
	CompletionRatio    float64 `json:"completion_ratio"`     // Ratio for completion vs prompt
	PricePerPrompt     float64 `json:"price_per_prompt"`     // Price per 1M prompt tokens
	PricePerCompletion float64 `json:"price_per_completion"` // Price per 1M completion tokens
	ModelPrice         float64 `json:"model_price"`          // Fixed price per request (if applicable)
}

// ModelCapabilities describes what the model can do
type ModelCapabilities struct {
	MaxTokens          int  `json:"max_tokens"`
	Streaming          bool `json:"streaming"`
	FineTuning         bool `json:"fine_tuning"`
	Functions          bool `json:"functions"`
	Embeddings         bool `json:"embeddings"`
	ImageGeneration    bool `json:"image_generation"`
	AudioTranscription bool `json:"audio_transcription"`
}

// ModelChannelType provides information about the channel type
type ModelChannelType struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	ChannelName string `json:"channel_name"`
}
